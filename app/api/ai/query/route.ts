import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { governInventoryQuery, governLLMDecision, type InventoryEvidence } from '@/lib/firekeeper-adapter';

function extractJsonOrText(text: string): { candidate: unknown; rawText: string } {
  const clean = text.trim();
  try { return { candidate: JSON.parse(clean), rawText: clean }; } catch { /* continue */ }
  const fenced = clean.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fenced) { try { return { candidate: JSON.parse(fenced[1]), rawText: fenced[1] }; } catch { /* continue */ } }
  const start = clean.indexOf('{');
  const end = clean.lastIndexOf('}');
  if (start >= 0 && end > start) {
    try { return { candidate: JSON.parse(clean.slice(start, end + 1)), rawText: clean }; } catch { /* continue */ }
  }
  return { candidate: null, rawText: clean };
}

export async function POST(req: NextRequest) {
  try {
    const { question = '', moduleContext = 'ALL' } = await req.json();
    const query = String(question).trim();
    if (!query) return NextResponse.json({ error: 'กรุณาระบุคำถาม' }, { status: 400 });

    const evidenceList: InventoryEvidence[] = [];
    const evidenceRaw: any[] = [];

    // 0. Aggregate System Metrics (Always included to answer count / aggregate queries accurately)
    const [totalProductCount, totalWarehouseCount, totalDocumentCount, inventorySumResult] = await Promise.all([
      prisma.product.count({ where: { isDeleted: false } }).catch(() => 0),
      prisma.warehouse.count({ where: { active: true } }).catch(() => 0),
      prisma.document.count().catch(() => 0),
      prisma.inventory.aggregate({ _sum: { onHand: true } }).catch(() => ({ _sum: { onHand: 0 } })),
    ]);
    const totalStockQty = inventorySumResult._sum?.onHand || 0;

    evidenceRaw.push({
      type: 'METRICS',
      totalProducts: totalProductCount,
      totalWarehouses: totalWarehouseCount,
      totalDocuments: totalDocumentCount,
      totalStockQuantity: totalStockQty,
    });

    evidenceList.push({
      id: 'SYS-METRICS-001',
      sourceId: 'system:metrics',
      text: `[ข้อมูลสถิติภาพรวมทั้งระบบ (ERP Database Summary Statistics)] จำนวนสินค้าทั้งหมดในระบบ (Total Active Products): ${totalProductCount.toLocaleString()} รายการ | คลังสินค้าทั้งหมด (Active Warehouses): ${totalWarehouseCount} คลัง | เอกสารในระบบทั้งหมด (Total Documents): ${totalDocumentCount.toLocaleString()} ใบ | ปริมาณสต๊อกสินค้าคงคลังรวมทุกคลัง (Total Inventory Stock): ${totalStockQty.toLocaleString()} ชิ้น`,
    });

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

    // Fallback: If specific search yielded < 3 items, load top low-stock products
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

    const naturalSummaryAnswer = evidenceList.length
      ? `จากการตรวจสอบฐานข้อมูล ERP สำหรับคำถาม "${query}" พบข้อมูลสถิติและหลักฐานดังนี้:\n\n` +
        evidenceList.map((e) => `• ${e.text}`).slice(0, 6).join('\n')
      : 'ไม่พบข้อมูลหลักฐานที่ตรงกับคำถามในระบบ ERP';

    const governed = governInventoryQuery({
      question: query,
      evidence: evidenceList,
      answer: naturalSummaryAnswer,
      recommendation: evidenceList.length ? 'ใช้ข้อมูลหลักฐาน ERP DB เป็นหลักอ้างอิง' : undefined,
    });

    const evidenceText = evidenceList.map((e) => `[${e.id}] ${e.text}`).join('\n');

    // 4. Try DeepSeek Cloud API First (Ideal for Web Deployment)
    const deepseekApiKey = process.env.DEEPSEEK_API_KEY;
    const deepseekModel = process.env.DEEPSEEK_MODEL || 'deepseek-chat';

    if (deepseekApiKey && evidenceList.length) {
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
                content: `คุณคือ AI ERP Assistant ประจำระบบ S&B Enterprise ERP ภายใต้ FIRE KEEPER Governance\nตอบคำถามภาษาไทยให้อ่านง่าย กระชับ และเป็นธรรมชาติ โดยสรุปจากหลักฐานที่ให้มาเท่านั้น\nหากผู้ใช้ถามจำนวนสินค้า หรือจำนวนเอกสาร หรือภาพรวมระบบ ให้ตอบตามสถิติใน [SYS-METRICS-001] เสมอ ห้ามนำรายการตัวอย่างมานับแทนจำนวนรวมทั้งหมดของระบบ\nสร้าง JSON DecisionObject เท่านั้น ห้ามใส่ markdown\n\nโครงสร้างที่ต้องส่ง:\n{"options":[{"id":"ANSWER","text":"...สรุปคำตอบเป็นภาษาไทยอธิบายอย่างชัดเจน...","rationale":"...เหตุผล...","isRecommended":true}],"risks":[],"uncertainties":[],"consequences":[],"evidence":[],"assumptions":[],"recommendation":{"optionId":"ANSWER","rationale":"..."},"confidence":{"score":0.95,"label":"HIGH","breakdown":{"coverage":1,"reliability":1,"quality":1}},"applicable_policies":[],"policy_conflicts":[],"escalation_required":false,"controlLevel":"LOW"}`,
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
          const { candidate, rawText } = extractJsonOrText(rawContent);
          const validCandidate = candidate || { options: [{ id: 'ANSWER', text: rawText || naturalSummaryAnswer, isRecommended: true }] };
          const llmGoverned = governLLMDecision({ question: query, evidence: evidenceList, candidate: validCandidate });
          const answer = llmGoverned.decision.options.find((o) => o.isRecommended)?.text || llmGoverned.decision.options[0]?.text || naturalSummaryAnswer;
          return NextResponse.json({
            answer,
            evidence: evidenceRaw,
            governance: llmGoverned,
            source: 'deepseek+firekeeper-validated',
            model: deepseekModel,
          });
        }
      } catch (e) {
        console.error('DeepSeek execution fallback:', e);
      }
    }

    // 5. Try Local Ollama Instance (Ideal for Local Execution)
    const ollamaBase = process.env.OLLAMA_BASE_URL || process.env.OLLAMA_URL || 'http://localhost:11434';
    const ollamaModel = process.env.OLLAMA_MODEL || 'qwen3:4b';

    if (evidenceList.length) {
      try {
        const response = await fetch(`${ollamaBase.replace(/\/$/, '')}/api/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: ollamaModel,
            stream: false,
            prompt: `คุณคือ AI ERP Assistant ประจำระบบ S&B Enterprise ERP ภายใต้ FIRE KEEPER Governance\nตอบคำถามภาษาไทยให้อ่านง่าย กระชับ และเป็นธรรมชาติ โดยสรุปจากหลักฐานที่ให้มาเท่านั้น\nหากผู้ใช้ถามจำนวนสินค้า หรือจำนวนเอกสาร หรือภาพรวมระบบ ให้ตอบตามสถิติใน [SYS-METRICS-001] เสมอ ห้ามนำรายการตัวอย่างมานับแทนจำนวนรวมทั้งหมดของระบบ\n\nคำถาม: ${query}\n\nหลักฐาน authoritative:\n${evidenceText}\n\nให้ตอบคำถามเป็นภาษาไทยกระชับชัดเจน:`,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          const rawText = String(data.response || '').trim();
          if (rawText) {
            const candidate = extractJsonOrText(rawText).candidate || { options: [{ id: 'ANSWER', text: rawText, isRecommended: true }] };
            const llmGoverned = governLLMDecision({ question: query, evidence: evidenceList, candidate });
            const answer = llmGoverned.decision.options.find((o) => o.isRecommended)?.text || llmGoverned.decision.options[0]?.text || rawText;
            return NextResponse.json({
              answer,
              evidence: evidenceRaw,
              governance: llmGoverned,
              source: 'ollama+firekeeper-validated',
              model: ollamaModel,
            });
          }
        }
      } catch (e) {
        console.error('Ollama execution fallback:', e);
      }
    }

    return NextResponse.json({
      answer: naturalSummaryAnswer,
      evidence: evidenceRaw,
      governance: governed,
      source: 'firekeeper',
      model: deepseekApiKey ? deepseekModel : (ollamaModel || null),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Global AI query failed' }, { status: 500 });
  }
}
