import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { checkAuth, hasPermission } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const userRole = req.headers.get('x-user-role');
    const user = checkAuth(userRole);

    if (!hasPermission(user.role, 'categories:manage') && user.role !== 'ADMIN' && user.role !== 'MANAGER') {
      return NextResponse.json({ error: 'You do not have permission' }, { status: 403 });
    }

    // 1. Create or Upsert Standardized Categories (Finished Machines & Spare Parts)
    const categoryDefinitions = [
      // Finished Goods (สินค้าสำเร็จรูปทั้งเครื่อง)
      {
        name: 'สินค้าสำเร็จรูป - เครื่องซักผ้าและเครื่องอบผ้า (Washing & Dryer Machines)',
        description: 'เครื่องซักผ้าและเครื่องอบผ้าสำเร็จรูปทั้งเครื่อง (LG, Whirlpool, Samsung, Beko, ฯลฯ) พร้อมใช้งานและติดตั้ง',
        isFinishedGood: true,
      },
      {
        name: 'สินค้าสำเร็จรูป - ตู้น้ำหยอดเหรียญ (Water Vending Machines)',
        description: 'ตู้น้ำดื่มอัตโนมัติหยอดเหรียญและระบบสแกน QR ทั้งเครื่อง (ถัง 100L, 200L, ตู้น้ำพลังแม่เหล็ก)',
        isFinishedGood: true,
      },
      {
        name: 'สินค้าสำเร็จรูป - ตู้เติมเงินและตู้เติมน้ำมัน (Top-Up & Fuel Vending Machines)',
        description: 'ตู้เติมเงินมือถืออัตโนมัติ, ตู้เติมน้ำมันหยอดเหรียญ และตู้ล้างรถอัตโนมัติทั้งตู้',
        isFinishedGood: true,
      },
      {
        name: 'สินค้าสำเร็จรูป - เครื่องและตู้หยอดเหรียญอื่นๆ (Other Vending & Complete Machines)',
        description: 'ตู้อัดฉีด, ตู้แลกเหรียญ, เครื่องเดี่ยวอุตสาหกรรม และตู้หยอดเหรียญสำเร็จรูปประเภทอื่นๆ',
        isFinishedGood: true,
      },

      // Spare Parts & Components (อะไหล่และชิ้นส่วน)
      {
        name: 'อะไหล่เครื่องซักผ้าและเครื่องอบผ้า (Washing & Dryer Parts)',
        description: 'อะไหล่ ชิ้นส่วน และอุปกรณ์เสริมสำหรับเครื่องซักผ้าและเครื่องอบผ้า (มอเตอร์, จานซัก, วาล์วน้ำ, สวิตช์, สายพาน)',
        isFinishedGood: false,
      },
      {
        name: 'แผงวงจรและอุปกรณ์อิเล็กทรอนิกส์ (Control Boards & Electronics)',
        description: 'แผงควบคุม, เมนบอร์ด, สล็อตหยอดเหรียญ, หน้าจอ Display, หม้อแปลง และชุดควบคุม',
        isFinishedGood: false,
      },
      {
        name: 'อะไหล่ตู้น้ำดื่มและระบบกรองน้ำ (Water Dispenser & Filtration Parts)',
        description: 'ไส้กรองน้ำ, ถังสารกรอง, เฮ้าท์ซิ่ง, ปั๊มอัด, ปั๊มติ๊ก, Flow switch และอุปกรณ์กรองน้ำ',
        isFinishedGood: false,
      },
      {
        name: 'สายไฟ เต้ารับ และอุปกรณ์ไฟฟ้า (Cables, Sockets & Electrical Accessories)',
        description: 'สายไฟฟ้า, สายคอนโทรล, เต้ารับ, ปลั๊ก, สวิตซ์ และอุปกรณ์ระบบไฟฟ้า',
        isFinishedGood: false,
      },
      {
        name: 'ข้อต่อ ปั๊ม และท่อน้ำ/สายลม (Fittings, Valves, Pipes & Fasteners)',
        description: 'ข้อต่อ PVC, สายน้ำ, สายลม, วาล์ว, ตะปูรีเวท, น๊อต และฮาร์ดแวร์',
        isFinishedGood: false,
      },
      {
        name: 'โครงตู้ กล่อง และชิ้นส่วนโครงสร้าง (Cabinets, Boxes & Enclosures)',
        description: 'โครงตู้เปล่า, กล่องเหล็ก, ลิ้นชัก, ขาตั้ง และชิ้นส่วนงานโครงสร้างตู้',
        isFinishedGood: false,
      },
      {
        name: 'สติ๊กเกอร์ ป้าย และคู่มือใช้งาน (Stickers, Labels & Manuals)',
        description: 'สติ๊กเกอร์บอกราคา, ป้ายหน้ากล่อง, สติ๊กเกอร์ช่องหยอดเหรียญ และคู่มือใช้งาน',
        isFinishedGood: false,
      },
      {
        name: 'งานบริการและค่าบริการ (Services & Maintenance Fees)',
        description: 'ค่าบริการซ่อม, ล้างเครื่อง, ยกตู้ และบริการบำรุงรักษา',
        isFinishedGood: false,
      },
      {
        name: 'ชิ้นส่วนและอุปกรณ์ทั่วไป (General Components & Hardware)',
        description: 'ชิ้นส่วนอะไหล่ทั่วไป, เทปใส, อุปกรณ์แพ็คเกจจิ้ง และฮาร์ดแวร์เบ็ดเตล็ด',
        isFinishedGood: false,
      },
    ];

    const categoryMap: Record<string, any> = {};
    for (const def of categoryDefinitions) {
      const cat = await prisma.category.upsert({
        where: { name: def.name },
        update: { description: def.description },
        create: { name: def.name, description: def.description },
      });
      categoryMap[def.name] = cat;
    }

    // 2. Rules for Classification
    const classificationRules = [
      {
        catName: 'สินค้าสำเร็จรูป - เครื่องซักผ้าและเครื่องอบผ้า (Washing & Dryer Machines)',
        test: (name: string) => {
          const isMachine = ['เครื่องซักผ้า', 'เครื่องอบผ้า'].some(kw => name.includes(kw));
          const isPart = ['อะไหล่', 'แผง', 'บอร์ด', 'มอเตอร์', 'วาล์ว', 'จานซัก', 'สวิตช์', 'สวิตช์ประตู', 'ถุงกรอง', 'สายพาน', 'ลูกยาง', 'แกนซัก', 'โช๊ค', 'สายน้ำเข้าตู้อัดฉีด', 'ไส้ไก่', 'บอลวาล์ว', 'ที่แขวน', 'น้ำยา'].some(kw => name.includes(kw));
          return isMachine && !isPart;
        }
      },
      {
        catName: 'สินค้าสำเร็จรูป - ตู้น้ำหยอดเหรียญ (Water Vending Machines)',
        test: (name: string) => {
          const isWaterMachine = ['ตู้น้ำถัง', 'ตู้น้ำพลังแม่เหล็ก', 'ตู้น้ำหยอดเหรียญ', 'ตู้น้ำดื่มอัตโนมัติ'].some(kw => name.includes(kw));
          const isPart = ['ไส้กรอง', 'เฮ้าท์ซิ่ง', 'ปั๊ม', 'ข้อต่อ', 'แร่', 'ถังสาร', 'อะไหล่', 'เพลส', 'สติ๊กเกอร์', 'ลูกลอย', 'หม้อแปลง', 'ตู้น้ำหน้าตู้'].some(kw => name.includes(kw));
          return isWaterMachine && !isPart;
        }
      },
      {
        catName: 'สินค้าสำเร็จรูป - ตู้เติมเงินและตู้เติมน้ำมัน (Top-Up & Fuel Vending Machines)',
        test: (name: string) => {
          const isMachine = ['ตู้เติมเงิน', 'ตู้เติมน้ำมัน', 'ตู้ล้างรถหยอดเหรียญ', 'ตู้ล้างรถ ATM', 'ตู้ล้างรถ 4 ระบบ'].some(kw => name.includes(kw));
          const isPart = ['โครง', 'สติ๊กเกอร์', 'แผง', 'สาย', 'หัวฉีด', 'ปั๊ม', 'สล็อต', 'น้ำยา', 'แชมพู'].some(kw => name.includes(kw));
          return isMachine && !isPart;
        }
      },
      {
        catName: 'สินค้าสำเร็จรูป - เครื่องและตู้หยอดเหรียญอื่นๆ (Other Vending & Complete Machines)',
        test: (name: string) => {
          const isOtherMachine = ['เครื่องเดี่ยวอุตสาหกรรม', 'ตู้แลกเหรียญ', 'ตู้อัดฉีดหยอดเหรียญ'].some(kw => name.includes(kw));
          const isPart = ['สาย', 'ไส้ไก่', 'บอลวาล์ว', 'ที่แขวน', 'สล็อต', 'แผง'].some(kw => name.includes(kw));
          return isOtherMachine && !isPart;
        }
      },
      {
        catName: 'อะไหล่เครื่องซักผ้าและเครื่องอบผ้า (Washing & Dryer Parts)',
        test: (name: string) => ['ซักผ้า', 'เครื่องซักผ้า', 'อบผ้า', 'ฝาหน้า', 'ฝาบน', 'จานซัก', 'มอเตอร์เดรน', 'lg', 'whirlpool', 'beko', 'samsung'].some((kw) => name.toLowerCase().includes(kw))
      },
      {
        catName: 'แผงวงจรและอุปกรณ์อิเล็กทรอนิกส์ (Control Boards & Electronics)',
        test: (name: string) => ['แผงวงจร', 'แผงบน', 'แผงล่าง', 'ebr', 'สล็อต', 'หยอดเหรียญ', 'slot', 'หน้าจอ', 'สล็อตรับเหรียญ', 'jy100'].some((kw) => name.toLowerCase().includes(kw))
      },
      {
        catName: 'อะไหล่ตู้น้ำดื่มและระบบกรองน้ำ (Water Dispenser & Filtration Parts)',
        test: (name: string) => ['ตู้น้ำ', 'ไส้กรอง', 'เฮ้าท์ซิ่ง', 'แร่', 'ros', 'ปั๊มอัด', 'flow', 'ตู้อัดฉีด', 'ปั๊มติ๊ก', 'ตู้น้ำถัง'].some((kw) => name.toLowerCase().includes(kw))
      },
      {
        catName: 'สายไฟ เต้ารับ และอุปกรณ์ไฟฟ้า (Cables, Sockets & Electrical Accessories)',
        test: (name: string) => ['สายไฟ', 'สายคอนโทรล', 'เต้ารับ', 'ปลั๊ก', 'สวิตซ์', 'หน้ากาก', 'ปลอกหัวแร้ง', 'led', '3 ขา'].some((kw) => name.toLowerCase().includes(kw))
      },
      {
        catName: 'ข้อต่อ ปั๊ม และท่อน้ำ/สายลม (Fittings, Valves, Pipes & Fasteners)',
        test: (name: string) => ['pvc', 'ต่อตรง', 'สายลม', 'หุน', 'เกลียวนอก', 'ตรงเกลียว', 'ตะปูยิง', 'รีเวท', 'น๊อต', 'ดอกสว่าน'].some((kw) => name.toLowerCase().includes(kw))
      },
      {
        catName: 'โครงตู้ กล่อง และชิ้นส่วนโครงสร้าง (Cabinets, Boxes & Enclosures)',
        test: (name: string) => ['โครงตู้', 'กล่อง', 'ลิ้นชัก', 'ขาตั้ง', 'กล่องพัสดุ', 'ฝาครอบ', 'กระบอกกรองผ้า'].some((kw) => name.toLowerCase().includes(kw))
      },
      {
        catName: 'สติ๊กเกอร์ ป้าย และคู่มือใช้งาน (Stickers, Labels & Manuals)',
        test: (name: string) => ['st', 'สติ๊กเกอร์', 'คู่มือ', 'ป้าย', 'หน้ากล่อง', 'ราคา', 'ช่องหยอด'].some((kw) => name.toLowerCase().includes(kw))
      },
      {
        catName: 'งานบริการและค่าบริการ (Services & Maintenance Fees)',
        test: (name: string) => ['ค่าบริการ', 'ล้าง', 'ยกเครื่อง', 'ยกตู้'].some((kw) => name.toLowerCase().includes(kw))
      }
    ];

    const defaultFallbackCat = categoryMap['ชิ้นส่วนและอุปกรณ์ทั่วไป (General Components & Hardware)'];

    // 3. Fetch All Products
    const products = await prisma.product.findMany({
      where: { isDeleted: false },
      select: { id: true, name: true, categoryId: true },
    });

    let finishedGoodsCount = 0;
    let sparePartsCount = 0;
    const updates: Promise<any>[] = [];

    for (const prod of products) {
      let matchedCat = defaultFallbackCat;

      for (const rule of classificationRules) {
        if (rule.test(prod.name)) {
          matchedCat = categoryMap[rule.catName];
          break;
        }
      }

      if (matchedCat.name.startsWith('สินค้าสำเร็จรูป')) {
        finishedGoodsCount++;
      } else {
        sparePartsCount++;
      }

      if (prod.categoryId !== matchedCat.id) {
        updates.push(
          prisma.product.update({
            where: { id: prod.id },
            data: { categoryId: matchedCat.id },
          })
        );
      }
    }

    if (updates.length > 0) {
      await Promise.all(updates);
    }

    // Fetch updated category breakdown
    const updatedCategories = await prisma.category.findMany({
      include: {
        _count: {
          select: { products: { where: { isDeleted: false } } },
        },
      },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({
      message: `จัดกลุ่มสินค้าสำเร็จรูปและอะไหล่เรียบร้อยแล้ว (${products.length} รายการ)`,
      totalProducts: products.length,
      finishedGoodsCount,
      sparePartsCount,
      updatedCategories: updatedCategories.map((c) => ({
        id: c.id,
        name: c.name,
        isFinishedGood: c.name.startsWith('สินค้าสำเร็จรูป'),
        productCount: c._count.products,
      })),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to reclassify products' }, { status: 500 });
  }
}
