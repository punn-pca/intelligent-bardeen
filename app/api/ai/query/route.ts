import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { governInventoryQuery, governLLMDecision, type InventoryEvidence } from '@/lib/firekeeper-adapter';

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
    const { question = '', moduleContext = 'ALL' } = await req.json();
    const query = String(question).trim();
    if (!query) return NextResponse.json({ error: 'กรุณาระบุคำถาม' }, { status: 400 });

    const evidenceList: InventoryEvidence[] = [];
    const evidenceRaw: any[] = [];

    // 1. Search Products & Inventory
    const products = await prisma.product.findMany({
      where: {
        OR: [
          { sku: { contains: query } },
          { name: { contains: query } },
          { barcode: { contains: query } },
        ],
        isDeleted: false,
      },
      include: {
        inventories: { include: { warehouse: true } },
      },
      take: 10,
    });

    products.forEach((p) => {
      const totalStock = p.inventories.reduce((sum, inv) => sum + inv.onHand, 0);
      const invDetails = p.inventories.map(i => `${i.warehouse.name}: ${i.onHand}`).join(', ');
      evidenceRaw.push({ type: 'PRODUCT', id: p.id, sku: p.sku, name: p.name, totalStock, invDetails });
      evidenceList.push({
        id: `PROD-EVIDENCE-${p.sku}`,
        sourceId: `product:${p.sku}`,
        text: `สินค้า ${p.name} [SKU: ${p.sku}] | ราคาขาย ฿${p.sellingPrice} | สต๊อกรวม ${totalStock} ชิ้น (${invDetails || 'ไม่มีคลัง'}) | ขั้นต่ำ ${p.minStock} ชิ้น`,
      });
    });

    // 2. Search Documents (SO, INV, PO, QT, RC)
    const docs = await prisma.document.findMany({
      where: {
        OR: [
          { documentNo: { contains: query } },
          { notes: { contains: query } },
          { customer: { name: { contains: query } } },
          { supplier: { name: { contains: query } } },
        ],
      },
      include: { customer: true, supplier: true },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    docs.forEach((d) => {
      const party = d.customer?.name || d.supplier?.name || 'ไม่ระบุ';
      evidenceRaw.push({ type: 'DOCUMENT', id: d.id, documentNo: d.documentNo, documentType: d.documentType, grandTotal: d.grandTotal, status: d.status, party });
      evidenceList.push({
        id: `DOC-EVIDENCE-${d.documentNo}`,
        sourceId: `doc:${d.documentNo}`,
        text: `เอกสาร ${d.documentNo} (${d.documentType}) | คู่ค้า: ${party} | ยอดรวม ฿${d.grandTotal} | สถานะ: ${d.status} | ชำระเงิน: ${d.paymentStatus}`,
      });
    });

    // 3. Search Box Inventory if applicable
    try {
      const boxes = await prisma.$queryRawUnsafe<any[]>(`
        SELECT b.box_code, b.name AS box_name, b.location_code, b.status, w.name AS warehouse_name,
               p.sku, p.name AS product_name, i.quantity
        FROM box_inventory_items i JOIN box_inventory_boxes b ON b.id = i.box_id
        LEFT JOIN products p ON p.id = i.product_id LEFT JOIN warehouses w ON w.id = b.warehouse_id
        WHERE b.box_code LIKE ? OR b.name LIKE ? OR p.sku LIKE ? OR p.name LIKE ?
        LIMIT 10
      `, `%${query}%`, `%${query}%`, `%${query}%`, `%${query}%`);

      boxes.forEach((b, idx) => {
        evidenceRaw.push({ type: 'BOX', boxCode: b.box_code, productName: b.product_name, quantity: b.quantity, location: b.location_code });
        evidenceList.push({
          id: `BOX-EVIDENCE-${idx + 1}`,
          sourceId: `box:${b.box_code}`,
          text: `กล่อง ${b.box_code} | สินค้า: ${b.product_name || b.sku} (จำนวน ${b.quantity}) | คลัง: ${b.warehouse_name || '-'} / ตำแหน่ง ${b.location_code || '-'}`,
        });
      });
    } catch { /* Box table optional */ }

    // Fallback: If specific search yielded < 3 items, load top low-stock products or recent unpaid docs
    if (evidenceList.length < 3) {
      const lowStock = await prisma.product.findMany({
        where: { isDeleted: false },
        include: { inventories: { include: { warehouse: true } } },
        take: 5,
      });

      lowStock.forEach((p) => {
        const totalStock = p.inventories.reduce((sum, inv) => sum + inv.onHand, 0);
        evidenceList.push({
          id: `PROD-SUMMARY-${p.sku}`,
          sourceId: `product:${p.sku}`,
          text: `สินค้า ${p.name} [SKU: ${p.sku}] | สต๊อกคงเหลือปัจจุบัน ${totalStock} ชิ้น | ราคา ฿${p.sellingPrice}`,
        });
      });
    }

    const deterministicAnswer = evidenceList.length
      ? evidenceList.map((e) => e.text).slice(0, 5).join('\n')
      : 'ไม่พบข้อมูลที่ตรงกับคำถามในระบบ ERP';

    const governed = governInventoryQuery({
      question: query,
      evidence: evidenceList,
      answer: deterministicAnswer,
      recommendation: evidenceList.length ? 'ใช้ข้อมูลหลักฐาน ERP DB เป็นหลักอ้างอิง' : undefined,
    });

    const evidenceText = evidenceList.map((e) => `[${e.id}] ${e.text}`).join('\n');

    // 4. Try DeepSeek Cloud API First (Ideal for Web / Production Deployment)
    const deepseekApiKey = process.env.DEEPSEEK_API_KEY;
    const deepseekModel = process.env.DEEPSEEK_MODEL || 'deepseek-chat';

    if (deepseekApiKey && evidenceList.length && governed.validation.status === 'PASS') {
      try {
        const dsRes = await fetch('https://api.deepseek.com/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${deepseekApiKey}`,
          },
          body: JSON.stringify({
            model: deepseekModel,
            response_format: { type: 'json_object' },
            messages: [
              {
                role: 'system',
                content: `คุณคือ AI ERP Assistant ประจำระบบ S&B Enterprise ERP ภายใต้ FIRE KEEPER Governance\nตอบคำถามภาษาไทยให้อ่านง่าย กระชับ และตรงประเด็น โดยอ้างอิงจากหลักฐาน ERP เท่านั้น\nสร้าง JSON DecisionObject เท่านั้น ห้ามใส่ markdown\n\nกฎสำคัญ:\n1. ใช้ evidence เฉพาะรายการที่ให้มา โดยคง id, sourceId และ text ให้ตรงกันทุกตัวอักษร\n2. ห้ามสร้างหลักฐานใหม่ หรือเดาข้อเท็จจริงนอกเหนือจากหลักฐาน\n3. options ต้องมีคำตอบภาษาไทยสรุปประเด็นหลักได้อย่างถูกต้อง\n\nโครงสร้างที่ต้องส่ง:\n{"options":[{"id":"ANSWER","text":"...คำตอบสรุปภาษาไทย...","rationale":"...เหตุผลจากหลักฐาน...","isRecommended":true}],"risks":[],"uncertainties":[],"consequences":[],"evidence":[],"assumptions":[],"recommendation":{"optionId":"ANSWER","rationale":"..."},"confidence":{"score":0.95,"label":"HIGH","breakdown":{"coverage":1,"reliability":1,"quality":1}},"applicable_policies":[],"policy_conflicts":[],"escalation_required":false,"controlLevel":"LOW"}`,
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
            const llmGoverned = governLLMDecision({ question: query, evidence: evidenceList, candidate });
            if (llmGoverned.validation.status === 'PASS' || llmGoverned.validation.status === 'ESCALATE') {
              const answer = llmGoverned.decision.options.find((o) => o.isRecommended)?.text || llmGoverned.decision.options[0]?.text || deterministicAnswer;
              return NextResponse.json({
                answer,
                evidence: evidenceRaw,
                governance: llmGoverned,
                source: `deepseek+firekeeper-validated`,
                model: deepseekModel,
              });
            }
          }
        }
      } catch (e) {
        console.error('DeepSeek Cloud API execution fallback:', e);
      }
    }

    // 5. Try Local Ollama Instance (Ideal for Local Execution)
    const ollamaBase = process.env.OLLAMA_BASE_URL || process.env.OLLAMA_URL || 'http://localhost:11434';
    const ollamaModel = process.env.OLLAMA_MODEL || 'qwen3:4b';

    if (evidenceList.length && governed.validation.status === 'PASS') {
      try {
        const response = await fetch(`${ollamaBase.replace(/\/$/, '')}/api/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: ollamaModel,
            stream: false,
            format: 'json',
            prompt: `คุณคือ AI ERP Assistant ประจำระบบ S&B Enterprise ERP ภายใต้ FIRE KEEPER Governance\nตอบคำถามภาษาไทยให้อ่านง่าย กระชับ และตรงประเด็น โดยอ้างอิงจากหลักฐาน ERP เท่านั้น\nสร้าง JSON DecisionObject เท่านั้น ห้ามใส่ markdown\n\nกฎสำคัญ:\n1. ใช้ evidence เฉพาะรายการที่ให้มา โดยคง id, sourceId และ text ให้ตรงกันทุกตัวอักษร\n2. ห้ามสร้างหลักฐานใหม่ หรือเดาข้อเท็จจริงนอกเหนือจากหลักฐาน\n3. options ต้องมีคำตอบภาษาไทยสรุปประเด็นหลักได้อย่างถูกต้อง\n\nโครงสร้างที่ต้องส่ง:\n{"options":[{"id":"ANSWER","text":"...คำตอบสรุปภาษาไทย...","rationale":"...เหตุผลจากหลักฐาน...","isRecommended":true}],"risks":[],"uncertainties":[],"consequences":[],"evidence":[],"assumptions":[],"recommendation":{"optionId":"ANSWER","rationale":"..."},"confidence":{"score":0.92,"label":"HIGH","breakdown":{"coverage":1,"reliability":1,"quality":1}},"applicable_policies":[],"policy_conflicts":[],"escalation_required":false,"controlLevel":"LOW"}\n\nคำถาม: ${query}\n\nหลักฐาน authoritative:\n${evidenceText}`,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          const candidate = extractJson(String(data.response || ''));
          if (candidate) {
            const llmGoverned = governLLMDecision({ question: query, evidence: evidenceList, candidate });
            if (llmGoverned.validation.status === 'PASS' || llmGoverned.validation.status === 'ESCALATE') {
              const answer = llmGoverned.decision.options.find((o) => o.isRecommended)?.text || llmGoverned.decision.options[0]?.text || deterministicAnswer;
              return NextResponse.json({
                answer,
                evidence: evidenceRaw,
                governance: llmGoverned,
                source: 'ollama+firekeeper-validated',
                model: ollamaModel,
              });
            }
          }
        }
      } catch (e) {
        console.error('Global AI Ollama execution fallback:', e);
      }
    }

    return NextResponse.json({
      answer: deterministicAnswer,
      evidence: evidenceRaw,
      governance: governed,
      source: 'firekeeper',
      model: deepseekApiKey ? deepseekModel : (ollamaModel || null),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Global AI query failed' }, { status: 500 });
  }
}
