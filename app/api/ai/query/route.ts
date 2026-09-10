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

    // 0. Aggregate System Metrics, Category Breakdown & Company Profile
    const [totalProductCount, totalWarehouseCount, totalDocumentCount, inventorySumResult, allCategories, companySetting] = await Promise.all([
      prisma.product.count({ where: { isDeleted: false } }).catch(() => 0),
      prisma.warehouse.count({ where: { active: true } }).catch(() => 0),
      prisma.document.count().catch(() => 0),
      prisma.inventory.aggregate({ _sum: { onHand: true } }).catch(() => ({ _sum: { onHand: 0 } })),
      prisma.category.findMany({
        include: { _count: { select: { products: { where: { isDeleted: false } } } } },
      }).catch(() => []),
      prisma.companySetting.findFirst().catch(() => null),
    ]);
    const totalStockQty = inventorySumResult._sum?.onHand || 0;

    evidenceRaw.push({
      type: 'METRICS',
      totalProducts: totalProductCount,
      totalWarehouses: totalWarehouseCount,
      totalDocuments: totalDocumentCount,
      totalStockQuantity: totalStockQty,
      categories: allCategories.map(c => ({ name: c.name, count: c._count.products })),
      companySetting,
    });

    evidenceList.push({
      id: 'SYS-METRICS-001',
      sourceId: 'system:metrics',
      text: `[ข้อมูลสถิติภาพรวมทั้งระบบ (ERP Database Summary Statistics)] จำนวนสินค้าทั้งหมดในระบบ (Total Active Products): ${totalProductCount.toLocaleString()} รายการ | คลังสินค้าทั้งหมด (Active Warehouses): ${totalWarehouseCount} คลัง | เอกสารในระบบทั้งหมด (Total Documents): ${totalDocumentCount.toLocaleString()} ใบ | ปริมาณสต๊อกสินค้าคงคลังรวมทุกคลัง (Total Inventory Stock): ${totalStockQty.toLocaleString()} ชิ้น`,
    });

    if (allCategories.length > 0) {
      const catSummary = allCategories.map(c => `${c.name} (${c._count.products} สินค้า)`).join(', ');
      evidenceList.push({
        id: 'SYS-METRICS-002',
        sourceId: 'system:category-metrics',
        text: `[สรุปจำนานสินค้าแยกตามหมวดหมู่ (Product Category Summary)] ${catSummary}`,
      });
    }

    const comp = companySetting || {
      name: 'บริษัท เอส แอนด์ บี อิเล็กทรอนิกส์ เซอร์วิส จำกัด',
      taxId: '0105555081714',
      address: '120/288 หมู่ที่ 5 ตำบลบางเดื่อ อำเภอเมืองปทุมธานี จ.ปทุมธานี 12000',
      phone: '02-789-9999',
      email: 'info@sb-electronic.co.th',
      website: 'www.sb-electronic.co.th',
      bankName: 'ธนาคารกสิกรไทย (KBANK)',
      bankAccountNo: '123-4-56789-0',
      bankAccountName: 'บจก. เอส แอนด์ บี อิเล็กทรอนิกส์ เซอร์วิส',
    };

    evidenceList.push({
      id: 'SYS-COMPANY-PROFILE',
      sourceId: 'system:company-profile',
      text: `[ข้อมูลบริษัทและที่อยู่สำนักงาน ERP (Company Profile & Address)] ชื่อบริษัท: ${comp.name} | เลขประจำตัวผู้เสียภาษี (Tax ID): ${comp.taxId} | ที่อยู่สำนักงานใหญ่: ${comp.address} | เบอร์โทรศัพท์: ${comp.phone} | อีเมล: ${comp.email} | เว็บไซต์: ${comp.website} | ธนาคารชำระเงิน: ${comp.bankName} เลขบัญชี: ${comp.bankAccountNo} ชื่อบัญชี: ${comp.bankAccountName}`,
    });

    // 0.5. Excel Stock Ledger Matrix (Physical Inventory Ledger Breakdown)
    const [activeInventories, stockMovements] = await Promise.all([
      prisma.inventory.findMany({
        where: { onHand: { gt: 0 } },
        include: {
          product: { include: { category: true } },
          warehouse: true,
        },
        orderBy: { product: { sku: 'asc' } },
      }).catch(() => []),
      prisma.stockMovement.findMany({
        select: { productId: true, type: true, quantity: true, reference: true, transactionId: true },
      }).catch(() => []),
    ]);

    const movStats: Record<string, { stockIn: number; stockOut: number; dealerOut: number; shopeeOut: number }> = {};
    stockMovements.forEach((m) => {
      if (!movStats[m.productId]) {
        movStats[m.productId] = { stockIn: 0, stockOut: 0, dealerOut: 0, shopeeOut: 0 };
      }
      const ref = (m.reference || m.transactionId || '').toUpperCase();
      const qty = Math.abs(m.quantity);
      if (m.type === 'RECEIVE' || m.type === 'IN') {
        movStats[m.productId].stockIn += qty;
      } else if (m.type === 'ISSUE' || m.type === 'OUT') {
        if (ref.startsWith('B2608') || ref.startsWith('R2608')) {
          movStats[m.productId].dealerOut += qty;
        } else if (ref.includes('SHOPEE') || ref.startsWith('A2608')) {
          movStats[m.productId].shopeeOut += qty;
        } else {
          movStats[m.productId].stockOut += qty;
        }
      }
    });

    const activeLedgerItems = activeInventories.map(inv => {
      const pMov = movStats[inv.productId] || { stockIn: 0, stockOut: 0, dealerOut: 0, shopeeOut: 0 };
      const openingBalance = Math.max(0, inv.onHand - pMov.stockIn + pMov.stockOut + pMov.dealerOut + pMov.shopeeOut);
      return {
        id: inv.id,
        sku: inv.product.sku,
        name: inv.product.name,
        category: inv.product.category.name,
        openingBalance,
        stockIn: pMov.stockIn,
        stockOut: pMov.stockOut,
        dealerOut: pMov.dealerOut,
        shopeeOut: pMov.shopeeOut,
        onHand: inv.onHand,
        warehouse: inv.warehouse.name,
      };
    });

    const totalLedgerOnHand = activeLedgerItems.reduce((sum, item) => sum + item.onHand, 0);

    evidenceList.push({
      id: 'SYS-METRICS-003',
      sourceId: 'system:stock-ledger-matrix',
      text: `[ข้อมูลตารางสต๊อกสินค้าหลัก (Excel Stock Ledger Matrix 1:1 Page)] สินค้าที่มีสต๊อกคงเหลือเคลื่อนไหวในตารางหลัก: ${activeLedgerItems.length} รายการ | ยอดรวมสต๊อกคงเหลือสุทธิ (Total On-Hand): ${totalLedgerOnHand.toLocaleString()} ชิ้น`,
    });

    // 1. Smart Category & Keyword Matching
    const lowerQuery = query.toLowerCase();
    const stopWords = ['มีอะไรบ้าง', 'มีอะไร', 'บ้าง', 'รายการ', 'ของ', 'ใน', 'เกี่ยวกับ', 'เช็ค', 'ดู', 'ขอ', 'มี', 'กี่', 'เท่าไหร่', 'ครับ', 'ค่ะ', 'ไหม', 'อะไร', 'สินค้า', 'หมวดหมู่'];
    
    let cleanQuery = query;
    stopWords.forEach(sw => {
      cleanQuery = cleanQuery.replace(new RegExp(sw, 'gi'), '');
    });
    cleanQuery = cleanQuery.trim();

    // Check matching category
    const matchedCategories = allCategories.filter(cat => {
      const catName = cat.name.toLowerCase();
      return lowerQuery.includes(catName) || (cleanQuery && catName.includes(cleanQuery.toLowerCase())) || (cleanQuery && cleanQuery.toLowerCase().includes(catName));
    });

    const categoryIds = matchedCategories.map(c => c.id);

    matchedCategories.forEach(cat => {
      evidenceList.push({
        id: `CAT-EVIDENCE-${cat.id}`,
        sourceId: `category:${cat.id}`,
        text: `[หมวดหมู่สินค้าตรงกับคำถาม] หมวดหมู่: "${cat.name}" มีจำนวนสินค้าทั้งหมดในระบบ ${cat._count.products} รายการ`,
      });
    });

    // Search Products by Category OR SKU/Name/Barcode/Description OR Keywords
    const products = await prisma.product.findMany({
      where: {
        isDeleted: false,
        OR: [
          ...(categoryIds.length > 0 ? [{ categoryId: { in: categoryIds } }] : []),
          { sku: { contains: query } },
          { name: { contains: query } },
          { barcode: { contains: query } },
          ...(cleanQuery.length >= 2 ? [
            { sku: { contains: cleanQuery } },
            { name: { contains: cleanQuery } },
            { category: { name: { contains: cleanQuery } } },
          ] : []),
        ],
      },
      include: {
        category: true,
        inventories: { include: { warehouse: true } },
      },
      take: 15,
    });

    products.forEach((p) => {
      const totalStock = p.inventories.reduce((sum, inv) => sum + inv.onHand, 0);
      const invDetails = p.inventories.map(i => `${i.warehouse.name}: ${i.onHand}`).join(', ');
      evidenceRaw.push({ type: 'PRODUCT', id: p.id, sku: p.sku, name: p.name, category: p.category.name, totalStock, invDetails });
      evidenceList.push({
        id: `PROD-EVIDENCE-${p.sku}`,
        sourceId: `product:${p.sku}`,
        text: `สินค้า ${p.name} [SKU: ${p.sku}] (หมวดหมู่: ${p.category.name}) | ราคาขาย ฿${p.sellingPrice} | สต๊อกรวม ${totalStock} ชิ้น (${invDetails || 'ไม่มีคลัง'}) | ขั้นต่ำ ${p.minStock} ชิ้น`,
      });
    });

    // 1.5. Add Matching Stock Ledger Matrix Items to Evidence List
    const isLedgerQuery = /ตาราง|สต๊อกหลัก|ตารางสต๊อก|excel|matrix|ยอดยกมา|รับเข้า|เบิก|ส่งตัวแทน|shopee|ยอดคงเหลือ|คงเหลือ|มีสต๊อก/i.test(query);
    const matchingLedgerItems = activeLedgerItems.filter(item => {
      if (isLedgerQuery) return true;
      if (!cleanQuery) return item.onHand > 0;
      const q = cleanQuery.toLowerCase();
      return item.sku.toLowerCase().includes(q) || item.name.toLowerCase().includes(q) || item.category.toLowerCase().includes(q);
    }).slice(0, 25);

    matchingLedgerItems.forEach((item) => {
      evidenceRaw.push({ type: 'LEDGER', ...item });
      evidenceList.push({
        id: `LEDGER-EVIDENCE-${item.sku}`,
        sourceId: `ledger:${item.sku}`,
        text: `[ตารางสต๊อกสินค้าหลัก Excel Stock Ledger Matrix 1:1] สินค้า: ${item.name} [SKU: ${item.sku}] (หมวดหมู่: ${item.category}) | ยอดยกมา: ${item.openingBalance} | รับเข้า: +${item.stockIn} | เบิกลง: -${item.stockOut} | ส่งตัวแทน: -${item.dealerOut} | ขาย Shopee: -${item.shopeeOut} | ยอดคงเหลือสุทธิ: ${item.onHand} ชิ้น (คลัง: ${item.warehouse})`,
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
          ...(cleanQuery.length >= 2 ? [
            { documentNo: { contains: cleanQuery } },
            { customer: { name: { contains: cleanQuery } } },
            { supplier: { name: { contains: cleanQuery } } },
          ] : []),
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

    // Low-Stock Ranking Query: for questions asking "สินค้าไหนสต๊อกน้อย/หมด/ต่ำสุด"
    const isLowStockQuery = /น้อยที่สุด|น้อย|ต่ำสุด|ใกล้หมด|หมดแล้ว|สต๊อกน้อย|สต๊อกต่ำ|สต๊อกหมด|low.?stock|reorder/i.test(query);
    let lowStockRanking: Array<{ sku: string; name: string; category: string; onHand: number; minStock: number; warehouse: string }> = [];
    if (isLowStockQuery) {
      const allWithInventory = await prisma.product.findMany({
        where: { isDeleted: false },
        include: {
          category: true,
          inventories: { include: { warehouse: true } },
        },
      }).catch(() => []);

      lowStockRanking = allWithInventory
        .map((p) => {
          const onHand = p.inventories.reduce((sum, inv) => sum + inv.onHand, 0);
          const warehouse = p.inventories.map(i => i.warehouse.name).join(', ') || 'ไม่มีคลัง';
          return { sku: p.sku, name: p.name, category: p.category.name, onHand, minStock: p.minStock || 0, warehouse };
        })
        .filter(p => p.onHand >= 0)
        .sort((a, b) => a.onHand - b.onHand)
        .slice(0, 15);

      lowStockRanking.forEach((item, idx) => {
        evidenceRaw.push({ type: 'LOW_STOCK', ...item, rank: idx + 1 });
        evidenceList.push({
          id: `LOWSTOCK-${item.sku}`,
          sourceId: `lowstock:${item.sku}`,
          text: `[อันดับที่ ${idx + 1} สต๊อกน้อย] ${item.name} [SKU: ${item.sku}] (หมวด: ${item.category}) | สต๊อกคงเหลือ: ${item.onHand} ชิ้น | สต๊อกขั้นต่ำ: ${item.minStock} ชิ้น | คลัง: ${item.warehouse}`,
        });
      });
    }

    // In-Stock Products Query: for questions asking "สินค้าที่มีสต๊อกคงเหลือ > 0 / มีของพร้อมส่ง / ไม่เป็น 0"
    const isAvailableStockQuery = /มีสต๊อก|พร้อมขาย|มีของ|มากกว่า 0|> 0|ไม่เหลือ 0|ไม่เป็น 0|ไม่เท่ากับ 0|มีสต๊อกคงเหลือ|มีของอยู่|สต๊อกคงเหลือจริง/i.test(query);
    const inStockItems = activeLedgerItems.filter(item => item.onHand > 0);
    if (isAvailableStockQuery) {
      evidenceList.push({
        id: 'SYS-METRICS-INSTOCK-SUMMARY',
        sourceId: 'system:instock-summary',
        text: `[รายการสินค้าที่มีสต๊อกคงเหลือมากกว่า 0 ชิ้นทั้งหมด] ในระบบมีสินค้าที่มีสต๊อกพร้อมใช้งานรวม ${inStockItems.length} รายการ | ยอดรวมสต๊อกคงเหลือสุทธิ: ${totalLedgerOnHand.toLocaleString()} ชิ้น`,
      });

      inStockItems.forEach((item, idx) => {
        evidenceRaw.push({ type: 'INSTOCK', ...item, rank: idx + 1 });
        evidenceList.push({
          id: `INSTOCK-${item.sku}`,
          sourceId: `instock:${item.sku}`,
          text: `[สินค้ามีสต๊อกคงเหลือ (${idx + 1}/${inStockItems.length})] ${item.name} [SKU: ${item.sku}] (หมวด: ${item.category}) | ยอดคงเหลือ: ${item.onHand} ชิ้น | คลัง: ${item.warehouse}`,
        });
      });
    }

    const naturalSummaryAnswer = (() => {
      const q = query.toLowerCase();

      // 0. Greetings ("สวัสดี", "hello", "hi")
      if (/^(สวัสดี|สวัสดีครับ|สวัสดีค่ะ|หวัดดี|hello|hi|good morning|good afternoon)/i.test(q)) {
        return `สวัสดีครับ! ผมคือ S&B AI Assistant ผู้ช่วยอัจฉริยะประจำระบบ ERP\n\nผมสามารถช่วยเหลือคุณได้ทั้ง:\n• ตรวจสอบสต๊อกสินค้า สถิติระบบ และรายงานเอกสาร ERP\n• ให้คำแนะนำเรื่องการบริหารจัดการคลังสินค้า เทคนิคการขาย และความรู้ทั่วไปทางธุรกิจ\n\nมีข้อมูลอะไรให้ผมช่วยดูแลในวันนี้ไหมครับ?`;
      }

      // 0.1 Thank you ("ขอบคุณ", "thanks")
      if (/^(ขอบคุณ|ขอบคุณครับ|ขอบคุณค่ะ|thanks|thank you)/i.test(q)) {
        return `ด้วยความยินดีครับ! หากมีข้อสงสัยเกี่ยวกับระบบ ERP หรือคำถามอื่นเพิ่มเติม สอบถามผมได้ตลอดเวลาเลยครับ 😊`;
      }

      // 0.2 Low-Stock Ranking Query ("สินค้าไหนสต๊อกน้อยที่สุด", "สต๊อกใกล้หมด", "สินค้าต่ำสุด")
      if (isLowStockQuery && lowStockRanking.length > 0) {
        const outOfStock = lowStockRanking.filter(p => p.onHand === 0);
        const critical = lowStockRanking.filter(p => p.onHand > 0 && p.onHand <= p.minStock && p.minStock > 0);
        const low = lowStockRanking.filter(p => p.onHand > 0 && !(p.onHand <= p.minStock && p.minStock > 0)).slice(0, 10);

        const lines: string[] = [];
        if (outOfStock.length > 0) {
          lines.push(`🔴 **สินค้าหมดสต๊อก (0 ชิ้น)** — ${outOfStock.length} รายการ:`);
          outOfStock.slice(0, 5).forEach((p, i) =>
            lines.push(`   ${i + 1}. ${p.name} [${p.sku}] | หมวด: ${p.category}`)
          );
        }
        if (critical.length > 0) {
          lines.push(`\n🟡 **สินค้าต่ำกว่าขั้นต่ำ** — ${critical.length} รายการ:`);
          critical.slice(0, 5).forEach((p, i) =>
            lines.push(`   ${i + 1}. ${p.name} [${p.sku}] | สต๊อก: ${p.onHand} ชิ้น (ขั้นต่ำ: ${p.minStock})`)
          );
        }
        if (outOfStock.length === 0 && critical.length === 0 && low.length > 0) {
          lines.push(`🟢 **สินค้าสต๊อกน้อยที่สุด** (เรียงจากน้อยไปมาก):`);
          low.slice(0, 10).forEach((p, i) =>
            lines.push(`   ${i + 1}. ${p.name} [${p.sku}] | สต๊อก: ${p.onHand} ชิ้น | หมวด: ${p.category}`)
          );
        }

        return `จากการตรวจสอบระบบ ERP พบข้อมูลสต๊อกสินค้าที่น้อยที่สุด ดังนี้:\n\n${lines.join('\n')}`;
      }

      // 0.3 In-Stock Products Query ("สินค้าที่มีสต๊อกคงเหลือ > 0 / มีของอยู่ / มีสต๊อก")
      if (isAvailableStockQuery && inStockItems.length > 0) {
        const topList = inStockItems.slice(0, 15).map((item, idx) => {
          return `${idx + 1}. ${item.name} [SKU: ${item.sku}] (หมวด: ${item.category})\n   • คงเหลือ: ${item.onHand.toLocaleString()} ชิ้น | คลัง: ${item.warehouse}`;
        }).join('\n\n');
        return `จากการตรวจสอบตารางสต๊อกสินค้าหลัก (Stock Ledger Matrix) พบสินค้าที่มีสต๊อกคงเหลือมากกว่า 0 ชิ้น ทั้งหมด ${inStockItems.length} รายการ (รวมทุกคลัง ${totalLedgerOnHand.toLocaleString()} ชิ้น) ตัวอย่างรายการสินค้าพร้อมขายมีดังนี้:\n\n${topList}\n\n(มีทั้งหมด ${inStockItems.length} รายการที่มีสต๊อกคงเหลือในระบบ)`;
      }

      // 0.4 Company Profile Query ("ที่อยู่บริษัท", "ข้อมูลบริษัท", "เลขผู้เสียภาษี", "ติดต่อบริษัท")
      if (/ที่อยู่|ที่ตั้ง|สำนักงาน|บริษัท|เบอร์โทร|เลขผู้เสียภาษี|tax.?id|email|อีเมล|เว็บไซต์|ธนาคาร|เลขบัญชี|ติดต่อ/i.test(q)) {
        return `🏢 **ข้อมูลบริษัทและที่อยู่สำนักงานใหญ่ในระบบ ERP:**\n\n• **ชื่อบริษัท:** ${comp.name}\n• **เลขประจำตัวผู้เสียภาษี (Tax ID):** ${comp.taxId}\n• **ที่อยู่สำนักงานใหญ่:** ${comp.address}\n• **เบอร์โทรศัพท์:** ${comp.phone}\n• **อีเมล:** ${comp.email}\n• **เว็บไซต์:** ${comp.website}\n• **บัญชีธนาคารชำระเงิน:** ${comp.bankName} เลขที่บัญชี ${comp.bankAccountNo} (ชื่อบัญชี: ${comp.bankAccountName})`;
      }

      // 1. Category Query ("สินค้ามีหมวดหมู่อะไรบ้าง", "หมวดหมู่สินค้า", "มีกี่หมวดหมู่")
      if (/หมวดหมู่|หมวด|ประเภท|category|categories/i.test(q)) {
        if (allCategories.length > 0) {
          const catList = allCategories
            .map((c, idx) => `${idx + 1}. ${c.name} (${(c._count?.products ?? (c as any).count ?? 0).toLocaleString()} สินค้า)`)
            .join('\n');
          return `หมวดหมู่สินค้าในระบบ S&B Enterprise ERP มีทั้งหมด ${allCategories.length} หมวดหมู่ ดังนี้:\n\n${catList}`;
        }
      }

      // 2. Count / Total System Stats Query ("จำนวนสินค้าทั้งหมด", "มีกี่รายการ", "ยอดรวมสินค้า", "สต๊อกรวม")
      if (/ทั้งหมด|กี่รายการ|รวม|ภาพรวม|สถิติ|นับ/i.test(q) && !/หมวด/i.test(q)) {
        return `ปัจจุบันในระบบ S&B Enterprise ERP มีสินค้าทั้งหมด ${totalProductCount.toLocaleString()} รายการ (${allCategories.length} หมวดหมู่) ใน ${totalWarehouseCount} คลังสินค้า โดยมียอดรวมสต๊อกคงเหลือรวมทุกคลังทั้งหมด ${totalStockQty.toLocaleString()} ชิ้น`;
      }

      // 3. Stock Ledger Matrix / Movement Columns Query ("ตารางสต๊อกหลัก", "ยอดยกมา", "เบิกลง", "ส่งตัวแทน", "ขาย shopee")
      const ledgerItems = evidenceRaw.filter(e => e.type === 'LEDGER');
      if (ledgerItems.length > 0 && /ตาราง|ยอดยกมา|รับเข้า|เบิก|ส่งตัวแทน|shopee|ยอดคงเหลือ/i.test(q)) {
        const list = ledgerItems.slice(0, 10).map((item, idx) => {
          return `${idx + 1}. ${item.name} [SKU: ${item.sku}] (หมวด: ${item.category})\n   • ยอดยกมา: ${item.openingBalance} | รับเข้า: +${item.stockIn} | เบิกลง: -${item.stockOut} | ส่งตัวแทน: -${item.dealerOut} | ขาย Shopee: -${item.shopeeOut} | ยอดคงเหลือ: ${item.onHand} ชิ้น`;
        }).join('\n\n');
        return `จากการตรวจสอบตารางสต๊อกสินค้าหลัก (Excel Stock Ledger Matrix) พบข้อมูลเคลื่อนไหวสินค้าดังนี้:\n\n${list}`;
      }

      // 4. Matched Products Query
      const productItems = evidenceRaw.filter(e => e.type === 'PRODUCT');
      if (productItems.length > 0) {
        const list = productItems.slice(0, 8).map((p, idx) => {
          return `${idx + 1}. ${p.name} [SKU: ${p.sku}] (หมวด: ${p.category || 'ทั่วไป'})\n   • สต๊อกคงเหลือ: ${p.totalStock} ชิ้น (${p.invDetails || 'ไม่มีคลัง'}) | ราคาขาย: ฿${p.sellingPrice || 0}`;
        }).join('\n\n');
        return `พบข้อมูลสินค้าในระบบ ERP ที่เกี่ยวข้องกับคำถาม "${query}" ดังนี้:\n\n${list}`;
      }

      // 5. Matched Documents Query
      const docItems = evidenceRaw.filter(e => e.type === 'DOCUMENT');
      if (docItems.length > 0) {
        const list = docItems.slice(0, 6).map((d, idx) => {
          return `${idx + 1}. เอกสาร ${d.documentNo} (${d.documentType})\n   • คู่ค้า: ${d.party} | ยอดรวม: ฿${d.grandTotal?.toLocaleString() || 0} | สถานะ: ${d.status}`;
        }).join('\n\n');
        return `พบเอกสารในระบบ ERP ที่เกี่ยวข้องกับคำถาม "${query}" ดังนี้:\n\n${list}`;
      }

      // 6. Advice / General question fallback when no product/doc matches
      if (/แนะนำ|วิธี|ทำอย่างไร|ควรทำ|คืออะไร|หลักการ|ประโยชน์|ข้อดี/i.test(q)) {
        return `ยินดีให้คำแนะนำครับ สำหรับคำถาม "${query}":\n\nคำแนะนำและแนวทางปฏิบัติทั่วไป:\n1. การบริหารจัดการและควบคุมข้อมูล: ควรมั่นใจว่าข้อมูลในระบบ ERP อัปเดตแบบ Real-time เพื่อลดความผิดพลาดในการปฏิบัติงาน\n2. การตรวจสอบสต๊อกคงคลัง: ควรตั้งค่า Reorder Point (จุดสั่งซื้อเติม) และตรวจนับสินค้าคงคลังอย่างสม่ำเสมอ\n3. การเชื่อมโยงข้อมูล: ระบบ ERP ช่วยให้การเชื่อมโยงคลังสินค้าและการออกเอกสารทำงานได้อย่างมีประสิทธิภาพ\n\n(คุณสามารถสอบถามข้อมูลสินค้าหรือเอกสารเฉพาะเจาะจงเพิ่มเติมในระบบได้ตลอดเวลาครับ)`;
      }

      // 7. General Fallback
      return evidenceList.length
        ? `จากการตรวจสอบฐานข้อมูล ERP พบสถิติระบบดังนี้:\n• สินค้าทั้งหมด: ${totalProductCount.toLocaleString()} รายการ (${allCategories.length} หมวดหมู่)\n• สต๊อกสินค้าคงเหลือรวมทุกคลัง: ${totalStockQty.toLocaleString()} ชิ้น`
        : 'ยินดีให้บริการครับ สามารถสอบถามข้อมูลเกี่ยวกับสินค้า สต๊อกสินค้า เอกสาร หรือคำถามทั่วไปได้เลยครับ';
    })();

    const governed = governInventoryQuery({
      question: query,
      evidence: evidenceList,
      answer: naturalSummaryAnswer,
      recommendation: evidenceList.length ? 'ใช้ข้อมูลหลักฐาน ERP DB เป็นหลักอ้างอิง' : undefined,
    });

    const evidenceText = evidenceList.map((e) => `[${e.id}] ${e.text}`).join('\n');

    // 4. Try DeepSeek Cloud API First (Primary LLM Engine)
    const { apiKey: clientApiKey = '', model: clientModel = '' } = await req.json().catch(() => ({}));
    let deepseekApiKey = (clientApiKey || process.env.DEEPSEEK_API_KEY || '').trim();

    if (!deepseekApiKey) {
      try {
        const setting = await prisma.companySetting.findFirst();
        if (setting && (setting as any).deepseekApiKey) {
          deepseekApiKey = String((setting as any).deepseekApiKey).trim();
        }
      } catch {}
    }

    const deepseekModel = clientModel || process.env.DEEPSEEK_MODEL || 'deepseek-chat';
    const geminiApiKey = (process.env.GEMINI_API_KEY || '').trim();
    const geminiModel = process.env.GEMINI_MODEL || 'gemini-1.5-flash';

    const systemPromptText = `คุณคือ AI ERP Assistant ผู้เชี่ยวชาญประจำระบบ S&B Enterprise ERP ภายใต้ FIRE KEEPER Governance

แนวทางการตอบคำถาม:
1. หากเป็นคำถามเกี่ยวกับข้อมูล ERP (สต๊อก, จำนวนสินค้า, เอกสาร, หมวดหมู่, คลังสินค้า):
   - ให้อ้างอิงและสรุปจากหลักฐาน authoritative ที่กำหนดให้เท่านั้น
   - หากผู้ใช้ถามจำนวนรวมทั้งหมด หรือภาพรวม ให้ตอบตามสถิติใน [SYS-METRICS-001] เสมอ ห้ามนำรายการตัวอย่างมานับแทน
2. หากเป็นคำถามทักทาย, คำถามทั่วไป, ความรู้ทางธุรกิจ, เทคนิคการจัดการคลัง/สต๊อก/บัญชี, หรือคำแนะนำเชิงบริหาร:
   - ให้ใช้ความรู้รอบตัว (General Intelligence) ตอบอย่างฉลาด มีประโยชน์ สุภาพ และชัดเจนเป็นภาษาไทย
   - ให้สวมบทบาทเป็นผู้ช่วยอัจฉริยะที่รอบรู้ทั้งข้อมูลระบบ ERP และความรู้ทางธุรกิจ/ทั่วไป`;

    if (deepseekApiKey) {
      try {
        let dsRes = await fetch('https://api.deepseek.com/chat/completions', {
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
                content: `${systemPromptText}\n\nสร้าง JSON DecisionObject เท่านั้น ห้ามใส่ markdown\n\nโครงสร้างที่ต้องส่ง:\n{"options":[{"id":"ANSWER","text":"...สรุปคำตอบเป็นภาษาไทยอธิบายอย่างชัดเจน...","rationale":"...เหตุผล...","isRecommended":true}],"risks":[],"uncertainties":[],"consequences":[],"evidence":[],"assumptions":[],"recommendation":{"optionId":"ANSWER","rationale":"..."},"confidence":{"score":0.95,"label":"HIGH","breakdown":{"coverage":1,"reliability":1,"quality":1}},"applicable_policies":[],"policy_conflicts":[],"escalation_required":false,"controlLevel":"LOW"}`,
              },
              {
                role: 'user',
                content: `คำถาม: ${query}\n\nหลักฐาน authoritative:\n${evidenceText}`,
              },
            ],
          }),
        });

        // Fallback retry if json_object response format fails with HTTP 400
        if (!dsRes.ok && dsRes.status === 400) {
          dsRes = await fetch('https://api.deepseek.com/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${deepseekApiKey}`,
            },
            body: JSON.stringify({
              model: deepseekModel,
              messages: [
                {
                  role: 'system',
                  content: systemPromptText,
                },
                {
                  role: 'user',
                  content: `คำถาม: ${query}\n\nหลักฐาน authoritative:\n${evidenceText}`,
                },
              ],
            }),
          });
        }

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
        } else {
          const errText = await dsRes.text().catch(() => '');
          console.error('DeepSeek API Error HTTP status:', dsRes.status, errText);
        }
      } catch (e) {
        console.error('DeepSeek execution fallback error:', e);
      }
    }

    // 4.5. Try Gemini API (Secondary Fallback)
    if (geminiApiKey) {
      try {
        const geminiRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${geminiApiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              system_instruction: { parts: [{ text: systemPromptText }] },
              contents: [{
                role: 'user',
                parts: [{ text: `คำถาม: ${query}\n\nข้อมูลหลักฐาน ERP (ใช้อ้างอิงเมื่อเกี่ยวข้อง):\n${evidenceText}\n\nตอบเป็นภาษาไทย กระชับ ชัดเจน เป็นธรรมชาติ:` }],
              }],
              generationConfig: { temperature: 0.7, maxOutputTokens: 1024 },
            }),
          }
        );

        if (geminiRes.ok) {
          const geminiData = await geminiRes.json();
          const rawText = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
          if (rawText) {
            const llmGoverned = governLLMDecision({
              question: query,
              evidence: evidenceList,
              candidate: { options: [{ id: 'ANSWER', text: rawText, isRecommended: true }] },
            });
            const answer = llmGoverned.decision.options.find((o) => o.isRecommended)?.text || rawText;
            return NextResponse.json({
              answer,
              evidence: evidenceRaw,
              governance: llmGoverned,
              source: 'gemini+firekeeper-validated',
              model: geminiModel,
            });
          }
        }
      } catch (e) {
        console.error('Gemini execution error:', e);
      }
    }

    // 5. Try Remote/Local Ollama Instance
    const ollamaBase = process.env.OLLAMA_BASE_URL || process.env.OLLAMA_URL || 'https://ollama.firekeeper.site';
    const ollamaModel = process.env.OLLAMA_MODEL || 'qwen3:4b';

    if (evidenceList.length) {
      try {
        const response = await fetch(`${ollamaBase.replace(/\/$/, '')}/api/generate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) S&B-ERP/1.0',
          },
          body: JSON.stringify({
            model: ollamaModel,
            stream: false,
            prompt: `${systemPromptText}\n\nคำถาม: ${query}\n\nหลักฐาน authoritative:\n${evidenceText}\n\nให้ตอบคำถามเป็นภาษาไทยกระชับชัดเจน:`,
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
