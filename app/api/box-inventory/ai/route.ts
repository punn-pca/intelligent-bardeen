import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { governInventoryQuery, governLLMDecision, type InventoryEvidence } from '@/lib/firekeeper-adapter';

async function ensureTables() {
  await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS box_inventory_boxes (id TEXT PRIMARY KEY NOT NULL, box_code TEXT NOT NULL UNIQUE, qr_token TEXT NOT NULL UNIQUE, name TEXT NOT NULL, warehouse_id TEXT, location_code TEXT, status TEXT NOT NULL DEFAULT 'ACTIVE', notes TEXT, created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP)`);
  await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS box_inventory_items (id TEXT PRIMARY KEY NOT NULL, box_id TEXT NOT NULL, product_id TEXT NOT NULL, quantity REAL NOT NULL DEFAULT 1, lot TEXT, serial TEXT, notes TEXT, created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP)`);
}

function toEvidence(rows: any[]): InventoryEvidence[] {
  return rows.map((e, index) => ({ id: `BOX-EVIDENCE-${index + 1}`, sourceId: `box:${e.box_code}`, text: `${e.box_code} | ${e.product_name || e.sku || '-'} | qty ${e.quantity} | warehouse ${e.warehouse_name || '-'} | location ${e.location_code || '-'} | sku ${e.sku || '-'} | status ${e.status || '-'}` }));
}

function extractJson(text: string): unknown | null {
  try { return JSON.parse(text); } catch { /* continue */ }
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fenced) { try { return JSON.parse(fenced[1]); } catch { /* continue */ } }
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start >= 0 && end > start) { try { return JSON.parse(start < end ? text.slice(start, end + 1) : ''); } catch { /* invalid model output */ } }
  return null;
}

export async function POST(req: NextRequest) {
  try {
    await ensureTables();
    const { q = '' } = await req.json();
    const query = String(q).trim();
    if (!query) return NextResponse.json({ error: 'กรุณาระบุคำถาม' }, { status: 400 });

    // 1. Initial SQL Search using Full Query String
    let rows = await prisma.$queryRawUnsafe<any[]>(`
      SELECT b.box_code, b.name AS box_name, b.location_code, b.status, w.code AS warehouse_code, w.name AS warehouse_name,
             p.sku, p.name AS product_name, p.barcode, i.quantity, i.lot, i.serial
      FROM box_inventory_items i JOIN box_inventory_boxes b ON b.id = i.box_id
      LEFT JOIN products p ON p.id = i.product_id LEFT JOIN warehouses w ON w.id = b.warehouse_id
      WHERE b.box_code LIKE ? OR b.name LIKE ? OR p.sku LIKE ? OR p.name LIKE ? OR p.barcode LIKE ? OR b.location_code LIKE ?
      ORDER BY b.box_code, p.name LIMIT 100
    `, `%${query}%`, `%${query}%`, `%${query}%`, `%${query}%`, `%${query}%`, `%${query}%`);

    // 2. Keyword Fallback for Natural Language Queries (e.g. "ใน BOX 1 มีสินค้าอะไรบ้าง")
    if (rows.length === 0) {
      const words = query.match(/(?:BOX\s*\d+|[A-Za-z0-9-]+|[\u0E00-\u0E7F]{3,})/gi) || [];
      if (words.length > 0) {
        const conditions = words.map(() => `(b.box_code LIKE ? OR b.name LIKE ? OR p.sku LIKE ? OR p.name LIKE ? OR b.location_code LIKE ?)`).join(' OR ');
        const params = words.flatMap(w => [`%${w}%`, `%${w}%`, `%${w}%`, `%${w}%`, `%${w}%`]);
        rows = await prisma.$queryRawUnsafe<any[]>(`
          SELECT b.box_code, b.name AS box_name, b.location_code, b.status, w.code AS warehouse_code, w.name AS warehouse_name,
                 p.sku, p.name AS product_name, p.barcode, i.quantity, i.lot, i.serial
          FROM box_inventory_items i JOIN box_inventory_boxes b ON b.id = i.box_id
          LEFT JOIN products p ON p.id = i.product_id LEFT JOIN warehouses w ON w.id = b.warehouse_id
          WHERE ${conditions}
          ORDER BY b.box_code, p.name LIMIT 50
        `, ...params);
      }
    }

    // 3. General Fallback: Load active box inventory as context if specific keywords yielded no match
    if (rows.length === 0) {
      rows = await prisma.$queryRawUnsafe<any[]>(`
        SELECT b.box_code, b.name AS box_name, b.location_code, b.status, w.code AS warehouse_code, w.name AS warehouse_name,
               p.sku, p.name AS product_name, p.barcode, i.quantity, i.lot, i.serial
        FROM box_inventory_items i JOIN box_inventory_boxes b ON b.id = i.box_id
        LEFT JOIN products p ON p.id = i.product_id LEFT JOIN warehouses w ON w.id = b.warehouse_id
        ORDER BY b.box_code, p.name LIMIT 50
      `);
    }

    const evidence = toEvidence(rows);
    const deterministicAnswer = rows.length
      ? rows.map((e) => `${e.box_code}: ${e.product_name || e.sku} จำนวน ${e.quantity} อยู่ ${e.warehouse_name || 'ไม่ระบุคลัง'} / ${e.location_code || 'ไม่ระบุตำแหน่ง'}`).join('\n')
      : 'ไม่พบข้อมูลใน Box Inventory';

    const governed = governInventoryQuery({
      question: query,
      evidence,
      answer: deterministicAnswer,
      recommendation: rows.length ? 'ใช้ข้อมูล Box Inventory เป็นหลักฐานอ้างอิงสำหรับคำตอบนี้' : undefined,
      risk: rows.length ? undefined : { text: 'ไม่มีหลักฐานจาก Box Inventory ที่ตรงกับคำถาม', severity: 'MEDIUM' },
    });

    const evidenceText = evidence.map((e) => `[${e.id}] ${e.text}`).join('\n');

    // 4. DeepSeek Cloud API (primary LLM for deployment)
    // DeepSeek currently exposes the OpenAI-compatible API at this base URL.
    const deepseekApiKey = process.env.DEEPSEEK_API_KEY;
    const deepseekBaseUrl = (process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com').replace(/\/$/, '');
    const deepseekModel = process.env.DEEPSEEK_MODEL || 'deepseek-v4-flash';

    if (deepseekApiKey && rows.length && governed.validation.status === 'PASS') {
      try {
        const dsRes = await fetch(`${deepseekBaseUrl}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${deepseekApiKey}`,
          },
          body: JSON.stringify({
            model: deepseekModel,
            thinking: { type: 'disabled' },
            response_format: { type: 'json_object' },
            stream: false,
            messages: [
              {
                role: 'system',
                content: `คุณคือ AI Inventory Assistant ภายใต้ FIRE KEEPER Governance\nตอบคำถามเป็นภาษาไทยให้อ่านง่าย กระชับ และตรงประเด็น โดยอ้างอิงจากหลักฐานที่ให้มาเท่านั้น\nสร้าง JSON DecisionObject เท่านั้น ห้ามใส่ markdown\n\nกฎสำคัญ:\n1. ใช้ evidence เฉพาะรายการที่ให้มา โดยคง id, sourceId และ text ให้ตรงกันทุกตัวอักษร\n2. ห้ามสร้างหลักฐานใหม่ หรือเดาข้อเท็จจริงนอกเหนือจากที่ระบุในหลักฐาน\n3. options ต้องมีคำตอบภาษาไทยที่สรุปตอบคำถามหลักได้อย่างถูกต้องตรงตามหลักฐาน\n\nโครงสร้างที่ต้องส่ง:\n{"options":[{"id":"ANSWER","text":"...คำตอบภาษาไทย...","rationale":"...เหตุผลจากหลักฐาน...","isRecommended":true}],"risks":[],"uncertainties":[],"consequences":[],"evidence":[],"assumptions":[],"recommendation":{"optionId":"ANSWER","rationale":"..."},"confidence":{"score":0.95,"label":"HIGH","breakdown":{"coverage":1,"reliability":1,"quality":1}},"applicable_policies":[],"policy_conflicts":[],"escalation_required":false,"controlLevel":"LOW"}`,
              },
              {
                role: 'user',
                content: `คำถาม: ${query}\n\nหลักฐาน authoritative:\n${evidenceText}`,
              },
            ],
          }),
        });

        if (dsRes.ok) {
          const dsData = await dsRes.json();
          const rawContent = dsData?.choices?.[0]?.message?.content || '';
          const candidate = extractJson(rawContent);
          if (candidate) {
            const llmGoverned = governLLMDecision({ question: query, evidence, candidate });
            if (llmGoverned.validation.status === 'PASS' || llmGoverned.validation.status === 'ESCALATE') {
              const answer = llmGoverned.decision.options.find((o) => o.isRecommended)?.text || llmGoverned.decision.options[0]?.text || deterministicAnswer;
              return NextResponse.json({
                answer,
                evidence: rows,
                governance: llmGoverned,
                source: 'deepseek+firekeeper-validated',
                model: deepseekModel,
              });
            }
          }
        } else {
          console.error('DeepSeek API error:', dsRes.status, await dsRes.text());
        }
      } catch (e: any) {
        console.error('DeepSeek execution fallback:', e);
      }
    }

    // 5. Try Local Ollama Instance as a fallback for local development
    const ollamaBase = process.env.OLLAMA_BASE_URL || process.env.OLLAMA_URL || 'http://localhost:11434';
    const ollamaModel = process.env.OLLAMA_MODEL || 'qwen3:4b';

    if (ollamaBase && ollamaModel && rows.length && governed.validation.status === 'PASS') {
      try {
        const response = await fetch(`${ollamaBase.replace(/\/$/, '')}/api/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: ollamaModel,
            stream: false,
            format: 'json',
            prompt: `คุณคือ AI Inventory Assistant ภายใต้ FIRE KEEPER Governance\nตอบคำถามเป็นภาษาไทยให้อ่านง่าย กระชับ และตรงประเด็น โดยอ้างอิงจากหลักฐานที่ให้มาเท่านั้น\nสร้าง JSON DecisionObject เท่านั้น ห้ามใส่ markdown\n\nกฎสำคัญ:\n1. ใช้ evidence เฉพาะรายการที่ให้มา โดยคง id, sourceId และ text ให้ตรงกันทุกตัวอักษร\n2. ห้ามสร้างหลักฐานใหม่ หรือเดาข้อเท็จจริงนอกเหนือจากที่ระบุในหลักฐาน\n3. options ต้องมีคำตอบภาษาไทยที่สรุปตอบคำถามหลักได้อย่างถูกต้องตรงตามหลักฐาน\n\nโครงสร้างที่ต้องส่ง:\n{"options":[{"id":"ANSWER","text":"...คำตอบภาษาไทย...","rationale":"...เหตุผลจากหลักฐาน...","isRecommended":true}],"risks":[],"uncertainties":[],"consequences":[],"evidence":[],"assumptions":[],"recommendation":{"optionId":"ANSWER","rationale":"..."},"confidence":{"score":0.9,"label":"HIGH","breakdown":{"coverage":1,"reliability":1,"quality":1}},"applicable_policies":[],"policy_conflicts":[],"escalation_required":false,"controlLevel":"LOW"}\n\nคำถาม: ${query}\n\nหลักฐาน authoritative:\n${evidenceText}`,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          const candidate = extractJson(String(data.response || ''));
          if (candidate) {
            const llmGoverned = governLLMDecision({ question: query, evidence, candidate });
            if (llmGoverned.validation.status === 'PASS' || llmGoverned.validation.status === 'ESCALATE') {
              const answer = llmGoverned.decision.options.find(o => o.isRecommended)?.text || llmGoverned.decision.options[0]?.text || deterministicAnswer;
              return NextResponse.json({
                answer,
                evidence: rows,
                governance: llmGoverned,
                source: 'ollama+firekeeper-validated',
                model: ollamaModel,
              });
            }
          }
        }
      } catch (e: any) {
        console.error('Ollama execution fallback:', e);
      }
    }

    return NextResponse.json({
      answer: deterministicAnswer,
      evidence: rows,
      governance: governed,
      source: 'firekeeper',
      model: deepseekApiKey ? deepseekModel : (ollamaModel || null),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'AI query failed' }, { status: 500 });
  }
}
