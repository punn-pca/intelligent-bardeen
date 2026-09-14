import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...');

  // 0. Seed Default Company Settings
  await prisma.companySetting.upsert({
    where: { id: 'default' },
    update: {
      name: 'บริษัท เอส แอนด์ บี อิเล็กทรอนิกส์ เซอร์วิส จำกัด',
      taxId: '0105555081714',
      address: '120/288 หมู่ที่ 5 ตำบลบางเดื่อ อำเภอเมืองปทุมธานี จ.ปทุมธานี 12000',
      bankAccountName: 'บจก. เอส แอนด์ บี อิเล็กทรอนิกส์ เซอร์วิส',
    },
    create: {
      id: 'default',
      name: 'บริษัท เอส แอนด์ บี อิเล็กทรอนิกส์ เซอร์วิส จำกัด',
      taxId: '0105555081714',
      address: '120/288 หมู่ที่ 5 ตำบลบางเดื่อ อำเภอเมืองปทุมธานี จ.ปทุมธานี 12000',
      phone: '02-789-9999',
      email: 'info@sb-electronic.co.th',
      website: 'www.sb-electronic.co.th',
      bankName: 'ธนาคารกสิกรไทย (KBANK)',
      bankAccountNo: '123-4-56789-0',
      bankAccountName: 'บจก. เอส แอนด์ บี อิเล็กทรอนิกส์ เซอร์วิส',
      defaultNotes: 'กรุณาตรวจสอบสินค้าและเอกสารก่อนลงนามรับของ ขอบคุณที่ใช้บริการ',
      signaturePreparedLabel: 'ผู้จัดทำ (Prepared By)',
      signatureApprovedLabel: 'ผู้อนุมัติ (Approved By)',
      signatureReceivedLabel: 'ผู้รับสินค้า / ลูกค้า (Received By)',
    },
  });
  console.log('✅ Company Settings initialized with official S & B Electronic Service info');

  // 1. Create Users for all 5 Roles
  const users = await Promise.all([
    prisma.user.upsert({
      where: { username: 'admin' },
      update: {},
      create: {
        id: 'usr-admin',
        username: 'admin',
        passwordHash: '$2a$10$abcdefghijklmnopqrstuu',
        name: 'System Admin',
        role: 'ADMIN',
      },
    }),
    prisma.user.upsert({
      where: { username: 'manager' },
      update: {},
      create: {
        id: 'usr-manager',
        username: 'manager',
        passwordHash: '$2a$10$abcdefghijklmnopqrstuu',
        name: 'Inventory Manager',
        role: 'MANAGER',
      },
    }),
    prisma.user.upsert({
      where: { username: 'warehouse' },
      update: {},
      create: {
        id: 'usr-warehouse',
        username: 'warehouse',
        passwordHash: '$2a$10$abcdefghijklmnopqrstuu',
        name: 'Warehouse Officer',
        role: 'WAREHOUSE',
      },
    }),
    prisma.user.upsert({
      where: { username: 'accounting' },
      update: {},
      create: {
        id: 'usr-accounting',
        username: 'accounting',
        passwordHash: '$2a$10$abcdefghijklmnopqrstuu',
        name: 'Accountant Officer',
        role: 'ACCOUNTING',
      },
    }),
    prisma.user.upsert({
      where: { username: 'user' },
      update: {},
      create: {
        id: 'usr-user',
        username: 'user',
        passwordHash: '$2a$10$abcdefghijklmnopqrstuu',
        name: 'General User',
        role: 'USER',
      },
    }),
  ]);
  console.log('✅ Created 5 users');

  // 2. Create Units
  const units = await Promise.all([
    prisma.unit.upsert({
      where: { code: 'PCS' },
      update: {},
      create: { code: 'PCS', name: 'ชิ้น', description: 'หน่วยชิ้น' },
    }),
    prisma.unit.upsert({
      where: { code: 'BOX' },
      update: {},
      create: { code: 'BOX', name: 'กล่อง', description: 'หน่วยกล่อง' },
    }),
    prisma.unit.upsert({
      where: { code: 'SET' },
      update: {},
      create: { code: 'SET', name: 'ชุด', description: 'หน่วยชุด' },
    }),
    prisma.unit.upsert({
      where: { code: 'PACK' },
      update: {},
      create: { code: 'PACK', name: 'แพ็ค', description: 'หน่วยแพ็ค' },
    }),
  ]);
  console.log('✅ Created 4 units');

  // 3. Create Warehouses
  const [whMain, whSecondary] = await Promise.all([
    prisma.warehouse.upsert({
      where: { code: 'WH-MAIN' },
      update: { name: 'คลังสินค้าหลัก (Bangkok Main Hub)' },
      create: {
        code: 'WH-MAIN',
        name: 'คลังสินค้าหลัก (Bangkok Main Hub)',
        address: '120/288 หมู่ที่ 5 ปทุมธานี',
        managerName: 'สมชาย สายตรง',
      },
    }),
    prisma.warehouse.upsert({
      where: { code: 'WH-BRANCH1' },
      update: { name: 'คลังสินค้าสาขา 1 (Rayong Branch)' },
      create: {
        code: 'WH-BRANCH1',
        name: 'คลังสินค้าสาขา 1 (Rayong Branch)',
        address: '88/9 นิคมอุตสาหกรรม มาบตาพุด ระยอง',
        managerName: 'วิชัย มั่นคง',
      },
    }),
  ]);
  console.log('✅ Created 2 warehouses');

  // 3.1 Create Locations for WH-MAIN
  await Promise.all([
    prisma.warehouseLocation.upsert({
      where: { warehouseId_code: { warehouseId: whMain.id, code: 'ZONE-A' } },
      update: {},
      create: { warehouseId: whMain.id, code: 'ZONE-A', name: 'โซน A - อุปกรณ์อิเล็กทรอนิกส์' },
    }),
    prisma.warehouseLocation.upsert({
      where: { warehouseId_code: { warehouseId: whMain.id, code: 'ZONE-B' } },
      update: {},
      create: { warehouseId: whMain.id, code: 'ZONE-B', name: 'โซน B - เครื่องใช้ไฟฟ้า' },
    }),
    prisma.warehouseLocation.upsert({
      where: { warehouseId_code: { warehouseId: whMain.id, code: 'RACK-01' } },
      update: {},
      create: { warehouseId: whMain.id, code: 'RACK-01', name: 'ชั้นวาง 01' },
    }),
  ]);
  console.log('✅ Created warehouse locations');

  // 4. Create Supplier & Customer
  const [supplier, customer] = await Promise.all([
    prisma.supplier.upsert({
      where: { code: 'SUPP-001' },
      update: { name: 'บริษัท ซัพพลายเออร์ เทค จำกัด' },
      create: {
        code: 'SUPP-001',
        name: 'บริษัท ซัพพลายเออร์ เทค จำกัด',
        contactPerson: 'คุณสมศักดิ์',
        email: 'contact@suppliertech.co.th',
        phone: '02-111-2222',
        address: '99/1 ถนนวิภาวดีรังสิต กรุงเทพฯ',
        taxId: '0105559998877',
      },
    }),
    prisma.customer.upsert({
      where: { code: 'CUST-001' },
      update: { name: 'บริษัท คัสตอมเมอร์ อิเล็กทริก จำกัด' },
      create: {
        code: 'CUST-001',
        name: 'บริษัท คัสตอมเมอร์ อิเล็กทริก จำกัด',
        contactPerson: 'คุณกัญญา',
        email: 'purchase@customerelectric.co.th',
        phone: '02-333-4444',
        address: '55/4 ถนนสุขุมวิท กรุงเทพฯ',
        taxId: '0105551112233',
      },
    }),
  ]);
  console.log('✅ Created Supplier and Customer');

  // 5. Create Categories
  // 5. Create Categories (Separated Finished Goods / Machines vs Spare Parts)
  const categoryDefs = [
    // Finished Goods
    {
      name: 'สินค้าสำเร็จรูป - เครื่องซักผ้าและเครื่องอบผ้า (Washing & Dryer Machines)',
      description: 'เครื่องซักผ้าและเครื่องอบผ้าสำเร็จรูปทั้งเครื่อง (LG, Whirlpool, Samsung, Beko, ฯลฯ) พร้อมใช้งานและติดตั้ง',
    },
    {
      name: 'สินค้าสำเร็จรูป - ตู้น้ำหยอดเหรียญ (Water Vending Machines)',
      description: 'ตู้น้ำดื่มอัตโนมัติหยอดเหรียญและระบบสแกน QR ทั้งเครื่อง (ถัง 100L, 200L, ตู้น้ำพลังแม่เหล็ก)',
    },
    {
      name: 'สินค้าสำเร็จรูป - ตู้เติมเงินและตู้เติมน้ำมัน (Top-Up & Fuel Vending Machines)',
      description: 'ตู้เติมเงินมือถืออัตโนมัติ, ตู้เติมน้ำมันหยอดเหรียญ และตู้ล้างรถอัตโนมัติทั้งตู้',
    },
    {
      name: 'สินค้าสำเร็จรูป - เครื่องและตู้หยอดเหรียญอื่นๆ (Other Vending & Complete Machines)',
      description: 'ตู้อัดฉีด, ตู้แลกเหรียญ, เครื่องเดี่ยวอุตสาหกรรม และตู้หยอดเหรียญสำเร็จรูปประเภทอื่นๆ',
    },

    // Spare Parts
    {
      name: 'อะไหล่เครื่องซักผ้าและเครื่องอบผ้า (Washing & Dryer Parts)',
      description: 'อะไหล่ ชิ้นส่วน และอุปกรณ์สำหรับเครื่องซักผ้าและเครื่องอบผ้าทุกยี่ห้อ (LG, Whirlpool, Samsung, Beko)',
    },
    {
      name: 'แผงวงจรและอุปกรณ์อิเล็กทรอนิกส์ (Control Boards & Electronics)',
      description: 'แผงควบคุม เมนบอร์ด สล็อตหยอดเหรียญ หน้าจอ และชุดควบคุมตู้อัตโนมัติ',
    },
    {
      name: 'อะไหล่ตู้น้ำดื่มและระบบกรองน้ำ (Water Dispenser & Filtration Parts)',
      description: 'ไส้กรอง ถังสารกรอง เฮ้าท์ซิ่ง ปั๊มอัด และอะไหล่ระบบกรองน้ำตู้น้ำดื่มอัตโนมัติ',
    },
    {
      name: 'สายไฟ เต้ารับ และอุปกรณ์ไฟฟ้า (Cables, Sockets & Electrical Accessories)',
      description: 'สายไฟฟ้า สายคอนโทรล เต้ารับ ปลั๊ก สวิตซ์ และอุปกรณ์ระบบไฟฟ้า',
    },
    {
      name: 'ข้อต่อ ปั๊ม และท่อน้ำ/สายลม (Fittings, Valves, Pipes & Fasteners)',
      description: 'ข้อต่อ PVC สายน้ำ สายลม น๊อต ตะปูรีเวท และอุปกรณ์ฟิตติ้งงานติดตั้ง',
    },
    {
      name: 'โครงตู้ กล่อง และชิ้นส่วนโครงสร้าง (Cabinets, Boxes & Enclosures)',
      description: 'โครงตู้น้ำ โครงตู้เติมเงิน กล่องเหล็ก ลิ้นชัก และงานโครงสร้างตู้หยอดเหรียญ',
    },
    {
      name: 'สติ๊กเกอร์ ป้าย และคู่มือใช้งาน (Stickers, Labels & Manuals)',
      description: 'สติ๊กเกอร์บอกราคา ป้ายหน้ากล่อง สติ๊กเกอร์ช่องหยอดเหรียญ และคู่มือการใช้งาน',
    },
    {
      name: 'งานบริการและค่าบริการ (Services & Maintenance Fees)',
      description: 'ค่าบริการซ่อม ล้างเครื่อง ยกตู้ และบริการบำรุงรักษา',
    },
    {
      name: 'ชิ้นส่วนและอุปกรณ์ทั่วไป (General Components & Hardware)',
      description: 'ชิ้นส่วนอะไหล่ทั่วไป เทปใส อุปกรณ์แพ็คเกจจิ้ง และฮาร์ดแวร์เบ็ดเตล็ด',
    },
  ];

  const categories = await Promise.all(
    categoryDefs.map((cat) =>
      prisma.category.upsert({
        where: { name: cat.name },
        update: { description: cat.description },
        create: { name: cat.name, description: cat.description },
      })
    )
  );
  console.log(`✅ Created ${categories.length} categories`);

  // Map categories by name for easy lookup
  const catMapByName: Record<string, any> = {};
  categories.forEach((c) => {
    catMapByName[c.name] = c;
  });

  const classificationRules = [
    {
      catName: 'สินค้าสำเร็จรูป - เครื่องซักผ้าและเครื่องอบผ้า (Washing & Dryer Machines)',
      test: (name: string) => {
        const isMachine = ['เครื่องซักผ้า', 'เครื่องอบผ้า'].some((kw) => name.includes(kw));
        const isPart = ['อะไหล่', 'แผง', 'บอร์ด', 'มอเตอร์', 'วาล์ว', 'จานซัก', 'สวิตช์', 'สวิตช์ประตู', 'ถุงกรอง', 'สายพาน', 'ลูกยาง', 'แกนซัก', 'โช๊ค', 'สายน้ำเข้าตู้อัดฉีด', 'ไส้ไก่', 'บอลวาล์ว', 'ที่แขวน', 'น้ำยา'].some((kw) => name.includes(kw));
        return isMachine && !isPart;
      },
    },
    {
      catName: 'สินค้าสำเร็จรูป - ตู้น้ำหยอดเหรียญ (Water Vending Machines)',
      test: (name: string) => {
        const isWaterMachine = ['ตู้น้ำถัง', 'ตู้น้ำพลังแม่เหล็ก', 'ตู้น้ำหยอดเหรียญ', 'ตู้น้ำดื่มอัตโนมัติ'].some((kw) => name.includes(kw));
        const isPart = ['ไส้กรอง', 'เฮ้าท์ซิ่ง', 'ปั๊ม', 'ข้อต่อ', 'แร่', 'ถังสาร', 'อะไหล่', 'เพลส', 'สติ๊กเกอร์', 'ลูกลอย', 'หม้อแปลง', 'ตู้น้ำหน้าตู้'].some((kw) => name.includes(kw));
        return isWaterMachine && !isPart;
      },
    },
    {
      catName: 'สินค้าสำเร็จรูป - ตู้เติมเงินและตู้เติมน้ำมัน (Top-Up & Fuel Vending Machines)',
      test: (name: string) => {
        const isMachine = ['ตู้เติมเงิน', 'ตู้เติมน้ำมัน', 'ตู้ล้างรถหยอดเหรียญ', 'ตู้ล้างรถ ATM', 'ตู้ล้างรถ 4 ระบบ'].some((kw) => name.includes(kw));
        const isPart = ['โครง', 'สติ๊กเกอร์', 'แผง', 'สาย', 'หัวฉีด', 'ปั๊ม', 'สล็อต', 'น้ำยา', 'แชมพู'].some((kw) => name.includes(kw));
        return isMachine && !isPart;
      },
    },
    {
      catName: 'สินค้าสำเร็จรูป - เครื่องและตู้หยอดเหรียญอื่นๆ (Other Vending & Complete Machines)',
      test: (name: string) => {
        const isOtherMachine = ['เครื่องเดี่ยวอุตสาหกรรม', 'ตู้แลกเหรียญ', 'ตู้อัดฉีดหยอดเหรียญ'].some((kw) => name.includes(kw));
        const isPart = ['สาย', 'ไส้ไก่', 'บอลวาล์ว', 'ที่แขวน', 'สล็อต', 'แผง'].some((kw) => name.includes(kw));
        return isOtherMachine && !isPart;
      },
    },
    {
      catName: 'อะไหล่เครื่องซักผ้าและเครื่องอบผ้า (Washing & Dryer Parts)',
      test: (name: string) => ['ซักผ้า', 'เครื่องซักผ้า', 'อบผ้า', 'ฝาหน้า', 'ฝาบน', 'จานซัก', 'มอเตอร์เดรน', 'lg', 'whirlpool', 'beko', 'samsung'].some((kw) => name.toLowerCase().includes(kw)),
    },
    {
      catName: 'แผงวงจรและอุปกรณ์อิเล็กทรอนิกส์ (Control Boards & Electronics)',
      test: (name: string) => ['แผงวงจร', 'แผงบน', 'แผงล่าง', 'ebr', 'สล็อต', 'หยอดเหรียญ', 'slot', 'หน้าจอ', 'สล็อตรับเหรียญ', 'jy100'].some((kw) => name.toLowerCase().includes(kw)),
    },
    {
      catName: 'อะไหล่ตู้น้ำดื่มและระบบกรองน้ำ (Water Dispenser & Filtration Parts)',
      test: (name: string) => ['ตู้น้ำ', 'ไส้กรอง', 'เฮ้าท์ซิ่ง', 'แร่', 'ros', 'ปั๊มอัด', 'flow', 'ตู้อัดฉีด', 'ปั๊มติ๊ก', 'ตู้น้ำถัง'].some((kw) => name.toLowerCase().includes(kw)),
    },
    {
      catName: 'สายไฟ เต้ารับ และอุปกรณ์ไฟฟ้า (Cables, Sockets & Electrical Accessories)',
      test: (name: string) => ['สายไฟ', 'สายคอนโทรล', 'เต้ารับ', 'ปลั๊ก', 'สวิตซ์', 'หน้ากาก', 'ปลอกหัวแร้ง', 'led', '3 ขา'].some((kw) => name.toLowerCase().includes(kw)),
    },
    {
      catName: 'ข้อต่อ ปั๊ม และท่อน้ำ/สายลม (Fittings, Valves, Pipes & Fasteners)',
      test: (name: string) => ['pvc', 'ต่อตรง', 'สายลม', 'หุน', 'เกลียวนอก', 'ตรงเกลียว', 'ตะปูยิง', 'รีเวท', 'น๊อต', 'ดอกสว่าน'].some((kw) => name.toLowerCase().includes(kw)),
    },
    {
      catName: 'โครงตู้ กล่อง และชิ้นส่วนโครงสร้าง (Cabinets, Boxes & Enclosures)',
      test: (name: string) => ['โครงตู้', 'กล่อง', 'ลิ้นชัก', 'ขาตั้ง', 'กล่องพัสดุ', 'ฝาครอบ', 'กระบอกกรองผ้า'].some((kw) => name.toLowerCase().includes(kw)),
    },
    {
      catName: 'สติ๊กเกอร์ ป้าย และคู่มือใช้งาน (Stickers, Labels & Manuals)',
      test: (name: string) => ['st', 'สติ๊กเกอร์', 'คู่มือ', 'ป้าย', 'หน้ากล่อง', 'ราคา', 'ช่องหยอด'].some((kw) => name.toLowerCase().includes(kw)),
    },
    {
      catName: 'งานบริการและค่าบริการ (Services & Maintenance Fees)',
      test: (name: string) => ['ค่าบริการ', 'ล้าง', 'ยกเครื่อง', 'ยกตู้'].some((kw) => name.toLowerCase().includes(kw)),
    },
  ];

  const defaultFallbackCat = catMapByName['ชิ้นส่วนและอุปกรณ์ทั่วไป (General Components & Hardware)'];

  // 6. Seed All Products & Inventories in Bulk from products-seed.json
  const fs = await import('fs');
  const path = await import('path');
  const productsSeedPath = path.join(__dirname, 'products-seed.json');
  if (fs.existsSync(productsSeedPath)) {
    const productsData = JSON.parse(fs.readFileSync(productsSeedPath, 'utf-8'));
    console.log(`📦 Seeding ${productsData.length} products & inventories in bulk...`);

    // Clean existing seed products to allow clean bulk seeding
    const existingCount = await prisma.product.count();
    if (existingCount > 0) {
      console.log('Cleaning existing products & inventories for clean re-seed...');
      await prisma.stockMovement.deleteMany({});
      await prisma.stockTransactionItem.deleteMany({});
      await prisma.stockTransaction.deleteMany({});
      await prisma.inventory.deleteMany({});
      await prisma.bundleItem.deleteMany({});
      await prisma.documentItem.deleteMany({});
      await prisma.product.deleteMany({});
    }

    const defaultUnit = units[0];

    const productRecords: any[] = [];
    const inventoryRecords: any[] = [];
    const seenInvKeys = new Set<string>();
    const seenProductIds = new Set<string>();
    const seenSkus = new Set<string>();

    for (const prod of productsData) {
      const { inventories, createdAt, updatedAt, ...productFields } = prod;

      // Dynamic category selection based on product name
      let matchedCat = defaultFallbackCat;
      const name = productFields.name || '';

      for (const rule of classificationRules) {
        if (rule.test(name)) {
          matchedCat = catMapByName[rule.catName] || defaultFallbackCat;
          break;
        }
      }

      productFields.categoryId = matchedCat.id;
      productFields.costPrice = 0;
      productFields.sellingPrice = 0;
      productFields.barcode = productFields.barcode || productFields.sku || `BAR-${productFields.id}`;
      if (productFields.unitId) productFields.unitId = defaultUnit.id;

      if (!seenProductIds.has(productFields.id) && !seenSkus.has(productFields.sku)) {
        seenProductIds.add(productFields.id);
        seenSkus.add(productFields.sku);
        productRecords.push(productFields);
      }

      if (inventories && Array.isArray(inventories)) {
        for (const inv of inventories) {
          const { createdAt: invC, updatedAt: invU, id: invId, ...invFields } = inv;
          invFields.productId = invFields.productId || productFields.id;
          invFields.warehouseId = whMain.id;
          const key = `${invFields.productId}_${invFields.warehouseId}`;
          if (!seenInvKeys.has(key)) {
            seenInvKeys.add(key);
            inventoryRecords.push(invFields);
          }
        }
      }
    }

    try {
      await prisma.product.createMany({
        data: productRecords,
      });

      await prisma.inventory.createMany({
        data: inventoryRecords,
      });

      // Create initial Stock Movements for seeded inventory so Data Consistency Check passes 100%
      const movementRecords = inventoryRecords
        .map((inv) => ({
          transactionId: null,
          type: 'RECEIVE',
          productId: inv.productId,
          warehouseId: inv.warehouseId,
          quantity: inv.onHand,
          unitCost: 0,
          totalCost: 0,
          beforeOnHand: 0,
          afterOnHand: inv.onHand,
          createdById: users[0].id,
          reference: 'INITIAL-SEED',
          reason: 'Initial Seed Inventory',
        }));

      await prisma.stockMovement.createMany({
        data: movementRecords,
      });

      console.log(`✅ ${productRecords.length} products, ${inventoryRecords.length} inventories, and ${movementRecords.length} movements seeded in bulk`);
    } catch (e) {
      console.error('Product bulk seed error:', e);
    }
  }

  console.log('🎉 Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
