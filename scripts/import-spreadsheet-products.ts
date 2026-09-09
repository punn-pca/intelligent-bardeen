import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function importExactSpreadsheetProducts() {
  console.log('📦 Importing Exact Product SKUs, Names, and Quantities from Document/Spreadsheet...');

  const contentPath = path.join(
    'C:',
    'Users',
    'Ton',
    '.gemini',
    'antigravity',
    'brain',
    'e2d0d45c-74ac-4fb4-96f6-1c3cd5bb42f1',
    '.system_generated',
    'steps',
    '736',
    'content.md'
  );

  if (!fs.existsSync(contentPath)) {
    throw new Error(`Content file not found at ${contentPath}`);
  }

  const fileText = fs.readFileSync(contentPath, 'utf-8');
  const lines = fileText.split('\n');

  // Master categories & warehouses
  const defaultCategory = await prisma.category.upsert({
    where: { name: 'สินค้าตู้น้ำและตู้หยอดเหรียญ (Vending & Spare Parts)' },
    update: {},
    create: {
      name: 'สินค้าตู้น้ำและตู้หยอดเหรียญ (Vending & Spare Parts)',
      description: 'สินค้าและชิ้นส่วนอะไหล่จากตารางต้นฉบับ',
    },
  });

  const defaultUnit = await prisma.unit.upsert({
    where: { code: 'PCS' },
    update: {},
    create: { code: 'PCS', name: 'ชิ้น' },
  });

  const mainWarehouse = await prisma.warehouse.findFirstOrThrow({ where: { code: 'MAIN' } });
  const warehouses = await prisma.warehouse.findMany();
  const adminUser = await prisma.user.findFirstOrThrow({ where: { username: 'admin' } });

  const seenSkus = new Map<string, { name: string; quantity: number }>();

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('Title:') || trimmed.startsWith('Description:') || trimmed.startsWith('Source:')) {
      continue;
    }

    const parts = line.split(',');
    if (parts.length < 3) continue;

    let rawSku = parts[1] ? parts[1].trim() : '';
    let rawName = parts[2] ? parts[2].trim() : '';
    let rawQtyStr = parts[3] ? parts[3].trim() : '';

    rawSku = rawSku.replace(/^["']|["']$/g, '');
    rawName = rawName.replace(/^["']|["']$/g, '');
    rawQtyStr = rawQtyStr.replace(/^["']|["']$/g, '');

    if (!rawSku || rawSku === 'รหัสสินค้า' || rawSku.length < 1) continue;
    if (!rawName || rawName === 'รายกาสินค้า') continue;

    const parsedQty = parseInt(rawQtyStr, 10);
    const qty = isNaN(parsedQty) ? 0 : Math.max(0, parsedQty);

    if (seenSkus.has(rawSku)) {
      const existing = seenSkus.get(rawSku)!;
      seenSkus.set(rawSku, { name: rawName || existing.name, quantity: existing.quantity + qty });
    } else {
      seenSkus.set(rawSku, { name: rawName, quantity: qty });
    }
  }

  console.log(`🔍 Found ${seenSkus.size} exact unique product SKUs from document`);

  let count = 0;
  for (const [sku, item] of seenSkus.entries()) {
    count++;
    const barcode = `885${count.toString().padStart(10, '0')}`;

    const prod = await prisma.product.upsert({
      where: { sku: sku },
      update: {
        name: item.name,
        active: true,
        isDeleted: false,
      },
      create: {
        sku: sku,
        barcode,
        name: item.name,
        categoryId: defaultCategory.id,
        unitId: defaultUnit.id,
        unit: 'ชิ้น',
        costPrice: 0.0,
        sellingPrice: 0.0,
        minStock: 5,
        maxStock: 100,
        active: true,
      },
    });

    // Set exact quantity in MAIN warehouse, 0 in other warehouses
    for (const wh of warehouses) {
      const targetQty = wh.id === mainWarehouse.id ? item.quantity : 0;
      await prisma.inventory.upsert({
        where: { productId_warehouseId: { productId: prod.id, warehouseId: wh.id } },
        update: { onHand: targetQty, reserved: 0 },
        create: { productId: prod.id, warehouseId: wh.id, onHand: targetQty, reserved: 0 },
      });

      if (wh.id === mainWarehouse.id && item.quantity > 0) {
        // Record Stock Movement to maintain 100% integrity
        const existingMov = await prisma.stockMovement.findFirst({
          where: { productId: prod.id, warehouseId: wh.id, reference: 'INITIAL_SPREADSHEET_IMPORT' },
        });

        if (!existingMov) {
          await prisma.stockMovement.create({
            data: {
              type: 'RECEIVE',
              productId: prod.id,
              warehouseId: wh.id,
              quantity: item.quantity,
              unitCost: 0.0,
              totalCost: 0.0,
              beforeOnHand: 0,
              afterOnHand: item.quantity,
              createdById: adminUser.id,
              reference: 'INITIAL_SPREADSHEET_IMPORT',
              reason: 'ยอดยกมาจากเอกสารต้นฉบับ',
            },
          });
        }
      }
    }
  }

  console.log(`✅ Successfully imported ${count} exact products with exact quantities & Stock Movements into database!`);
}

importExactSpreadsheetProducts()
  .catch((e) => {
    console.error('Import failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
