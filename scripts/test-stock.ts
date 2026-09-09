import { PrismaClient } from '@prisma/client';
import {
  processStockIn,
  processStockOut,
  processStockTransfer,
  processStockAdjustment,
  verifyStockIntegrity,
} from '../lib/stock-manager';
import { hasPermission, Role } from '../lib/auth';

const prisma = new PrismaClient();

async function runTests() {
  console.log('🧪 Running Stock & Inventory System Test Suite...\n');
  let passedCount = 0;
  let failedCount = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log(`  ✅ PASS: ${testName}`);
      passedCount++;
    } else {
      console.error(`  ❌ FAIL: ${testName}`);
      failedCount++;
    }
  }

  try {
    // Setup test environment
    const testAdmin = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
    const testStaff = await prisma.user.findFirst({ where: { role: 'USER' } });
    const mainWh = await prisma.warehouse.findFirst({ where: { code: 'MAIN' } });
    const storeWh = await prisma.warehouse.findFirst({ where: { code: 'BRANCH-01' } });
    const category = await prisma.category.findFirst();

    if (!testAdmin || !mainWh || !storeWh || !category) {
      throw new Error('Test environment missing seed data. Run npm run db:seed first!');
    }

    console.log('--- TEST GROUP 1: Product Management & Constraints ---');
    const testSku = `TEST-SKU-${Date.now()}`;
    const testBarcode = `885TEST${Math.floor(100000 + Math.random() * 900000)}`;

    const newProd = await prisma.product.create({
      data: {
        sku: testSku,
        barcode: testBarcode,
        name: 'สินค้าทดสอบ ระบบสต็อก',
        categoryId: category.id,
        unit: 'ชิ้น',
        costPrice: 500,
        sellingPrice: 850,
        minStock: 10,
        maxStock: 200,
      },
    });
    assert(!!newProd.id, 'Create product with valid SKU and Barcode');

    // Duplicate SKU
    let duplicateSkuErr = false;
    try {
      await prisma.product.create({
        data: {
          sku: testSku,
          barcode: `885OTHER${Math.floor(100000 + Math.random() * 900000)}`,
          name: 'Duplicate SKU test',
          categoryId: category.id,
        },
      });
    } catch (e) {
      duplicateSkuErr = true;
    }
    assert(duplicateSkuErr, 'Prevent duplicate SKU creation');

    // Duplicate Barcode
    let duplicateBarcodeErr = false;
    try {
      await prisma.product.create({
        data: {
          sku: `TEST-OTHER-${Date.now()}`,
          barcode: testBarcode,
          name: 'Duplicate Barcode test',
          categoryId: category.id,
        },
      });
    } catch (e) {
      duplicateBarcodeErr = true;
    }
    assert(duplicateBarcodeErr, 'Prevent duplicate Barcode creation');

    console.log('\n--- TEST GROUP 2: Core Stock Workflow ---');

    // 1. Admin receives 100 items Stock In
    const stockInRes = await processStockIn({
      productId: newProd.id,
      warehouseId: mainWh.id,
      quantity: 100,
      costPrice: 500,
      reference: 'PO-TEST-100',
      reason: 'รับสินค้าเข้าตั้งต้น 100 ชิ้น',
      createdById: testAdmin.id,
      username: testAdmin.username,
    });
    assert(stockInRes.quantity === 100, 'Stock In 100 units completed');

    // 2. Staff issues 20 items Stock Out
    const stockOutRes = await processStockOut({
      productId: newProd.id,
      warehouseId: mainWh.id,
      quantity: 20,
      reference: 'SO-TEST-020',
      reason: 'เบิกขายสินค้า 20 ชิ้น',
      createdById: testStaff?.id || testAdmin.id,
      username: testStaff?.username || testAdmin.username,
    });
    assert(stockOutRes.quantity === 20, 'Stock Out 20 units completed');

    // 3. Test Insufficient Stock & DB Rollback
    let insufficientErr = false;
    try {
      await processStockOut({
        productId: newProd.id,
        warehouseId: mainWh.id,
        quantity: 999, // Exceeds 80
        createdById: testAdmin.id,
        username: testAdmin.username,
      });
    } catch (e: any) {
      if (e.message.includes('Insufficient stock')) {
        insufficientErr = true;
      }
    }
    assert(insufficientErr, 'Insufficient Stock throws error & rolls back transaction');

    const invAfterFailedOut = await prisma.inventory.findUnique({
      where: { productId_warehouseId: { productId: newProd.id, warehouseId: mainWh.id } },
    });
    assert(invAfterFailedOut?.onHand === 80, 'Stock remains unchanged at 80 after failed Stock Out');

    // 4. Manager transfers 30 units from MAIN to STORE (BRANCH-01)
    const transferRes = await processStockTransfer({
      productId: newProd.id,
      sourceWarehouseId: mainWh.id,
      destinationWarehouseId: storeWh.id,
      quantity: 30,
      reference: 'TR-TEST-030',
      note: 'โอนสินค้าไปคลังสาขา',
      createdById: testAdmin.id,
      username: testAdmin.username,
    });
    assert(
      transferRes.quantity === 30,
      'Transfer 30 units completed'
    );

    // 5. Stock Adjustment on MAIN to 48 (found 48 in physical audit, delta -2)
    let missingReasonErr = false;
    try {
      await processStockAdjustment({
        productId: newProd.id,
        warehouseId: mainWh.id,
        actualStock: 48,
        reason: '', // Empty reason
        createdById: testAdmin.id,
        username: testAdmin.username,
      });
    } catch (e) {
      missingReasonErr = true;
    }
    assert(missingReasonErr, 'Stock Adjustment requires valid reason');

    const adjRes = await processStockAdjustment({
      productId: newProd.id,
      warehouseId: mainWh.id,
      actualStock: 48,
      reason: 'สินค้าชำรุดจากการนับสต็อกจริง',
      note: 'พบสินค้ากล่องบุบ 2 ชิ้น',
      createdById: testAdmin.id,
      username: testAdmin.username,
    });
    assert(adjRes.actualStock === 48 && adjRes.adjustmentQty === -2, 'Adjustment to 48: MAIN = 48 (delta -2)');

    console.log('\n--- TEST GROUP 3: Stock Movement Traceability & Audit ---');

    const movements = await prisma.stockMovement.findMany({
      where: { productId: newProd.id },
      orderBy: { createdAt: 'asc' },
    });

    const sumMovementsMain = movements
      .filter((m) => m.warehouseId === mainWh.id)
      .reduce((acc, m) => acc + m.quantity, 0);

    assert(sumMovementsMain === 48, `Movement timeline sum (+100 -20 -30 -2 = ${sumMovementsMain}) matches current MAIN stock (48)`);

    // Integrity Audit Test
    const integrity = await verifyStockIntegrity();
    assert(integrity.isValid, 'Stock Integrity Verification passed with zero discrepancies');

    console.log('\n--- TEST GROUP 4: Security & RBAC Permissions ---');
    assert(hasPermission('ADMIN' as Role, 'stock:adjustment'), 'ADMIN has permission for Stock Adjustment');
    assert(!hasPermission('USER' as Role, 'stock:adjustment'), 'USER does NOT have permission for Stock Adjustment');

    console.log(`\n📊 TEST RESULTS: ${passedCount} PASSED, ${failedCount} FAILED`);
    if (failedCount > 0) {
      process.exit(1);
    }
  } catch (error) {
    console.error('💥 Test suite crashed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runTests();
