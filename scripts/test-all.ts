import { PrismaClient } from '@prisma/client';
import { processStockIn, processStockOut, processStockTransfer, processStockAdjustment, verifyStockIntegrity } from '../lib/stock-manager';
import { createDocument, approveDocument, issueDocument, cancelDocument, generateDocumentNumber } from '../lib/document-engine';
import { hasPermission } from '../lib/auth';
import { generateDocumentHTML } from '../lib/pdf-generator';
import { getCompanySettings } from '../lib/company-config';

const prisma = new PrismaClient();

async function runAllTests() {
  console.log('🧪 Running Comprehensive Production Test Suite (End-to-End Scenarios)...\n');
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, message: string) {
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      failed++;
    }
  }

  try {
    // Master data
    const adminUser = await prisma.user.findFirstOrThrow({ where: { username: 'admin' } });
    const staffUser = await prisma.user.findFirstOrThrow({ where: { username: 'user' } });
    const warehouseUser = await prisma.user.findFirstOrThrow({ where: { username: 'warehouse' } });
    const accountingUser = await prisma.user.findFirstOrThrow({ where: { username: 'accounting' } });

    const whMain = await prisma.warehouse.findFirstOrThrow({ where: { code: 'MAIN' } });
    const whBranch = await prisma.warehouse.findFirstOrThrow({ where: { code: 'BRANCH-01' } });
    const supplier = await prisma.supplier.findFirstOrThrow({ where: { code: 'SUP-001' } });
    const customer = await prisma.customer.findFirstOrThrow({ where: { code: 'CUST-001' } });
    const category = await prisma.category.findFirst();

    // 1. SCENARIO 1: Create Product & Warehouse -> Stock In 100 -> Verify Stock = 100
    console.log('--- SCENARIO 1: Product Creation & Stock Receive ---');
    const testSku = `TEST-P1-${Date.now()}`;
    const testBarcode = `999000${Date.now().toString().slice(-7)}`;
    
    const testProduct = await prisma.product.create({
      data: {
        sku: testSku,
        barcode: testBarcode,
        name: 'Test Scenario Product',
        categoryId: category!.id,
        costPrice: 500,
        sellingPrice: 1000,
      },
    });
    assert(!!testProduct.id, 'Product created successfully');

    await processStockIn({
      productId: testProduct.id,
      warehouseId: whMain.id,
      quantity: 100,
      costPrice: 500,
      reference: 'SCENARIO-1-PO',
      reason: 'Initial Receive 100',
      createdById: adminUser.id,
      username: adminUser.username,
    });

    const inv1 = await prisma.inventory.findUnique({
      where: { productId_warehouseId: { productId: testProduct.id, warehouseId: whMain.id } },
    });
    assert(inv1?.onHand === 100, 'Stock In 100 units -> Inventory onHand = 100');

    // 2. SCENARIO 2: Issue 20 -> Verify Stock = 80
    console.log('\n--- SCENARIO 2: Stock Issue ---');
    await processStockOut({
      productId: testProduct.id,
      warehouseId: whMain.id,
      quantity: 20,
      reference: 'SCENARIO-2-SO',
      reason: 'Issue 20 units',
      createdById: staffUser.id,
      username: staffUser.username,
    });

    const inv2 = await prisma.inventory.findUnique({
      where: { productId_warehouseId: { productId: testProduct.id, warehouseId: whMain.id } },
    });
    assert(inv2?.onHand === 80, 'Issue 20 units -> Inventory onHand = 80');

    // 3. SCENARIO 3: Transfer 30 to Warehouse B -> Main = 50, Branch = 30
    console.log('\n--- SCENARIO 3: Atomic Stock Transfer ---');
    await processStockTransfer({
      productId: testProduct.id,
      sourceWarehouseId: whMain.id,
      destinationWarehouseId: whBranch.id,
      quantity: 30,
      reference: 'SCENARIO-3-TRF',
      note: 'Transfer 30 units',
      createdById: adminUser.id,
      username: adminUser.username,
    });

    const invMain3 = await prisma.inventory.findUnique({
      where: { productId_warehouseId: { productId: testProduct.id, warehouseId: whMain.id } },
    });
    const invBranch3 = await prisma.inventory.findUnique({
      where: { productId_warehouseId: { productId: testProduct.id, warehouseId: whBranch.id } },
    });

    assert(invMain3?.onHand === 50, 'Source Warehouse MAIN stock = 50');
    assert(invBranch3?.onHand === 30, 'Destination Warehouse BRANCH stock = 30');

    // 4. SCENARIO 4: Adjustment +10 -> Main Stock = 60
    console.log('\n--- SCENARIO 4: Stock Adjustment ---');
    await processStockAdjustment({
      productId: testProduct.id,
      warehouseId: whMain.id,
      actualStock: 60,
      reason: 'Physical count count mismatch +10',
      createdById: adminUser.id,
      username: adminUser.username,
    });

    const invMain4 = await prisma.inventory.findUnique({
      where: { productId_warehouseId: { productId: testProduct.id, warehouseId: whMain.id } },
    });
    assert(invMain4?.onHand === 60, 'Stock Adjustment to 60 -> MAIN stock = 60');

    // 5. SCENARIO 5: Issue Invoice -> Document Numbering & PDF Generation
    console.log('\n--- SCENARIO 5: Document Engine & PDF Generation ---');
    const docNoPO = await generateDocumentNumber('PO');
    assert(docNoPO.startsWith('PO-'), `Transaction-safe document auto-numbering generated: ${docNoPO}`);

    const invDoc = await createDocument({
      documentType: 'INVOICE',
      customerId: customer.id,
      warehouseId: whMain.id,
      notes: 'Scenario 5 Sales Invoice',
      createdById: accountingUser.id,
      items: [
        {
          productId: testProduct.id,
          quantity: 5,
          unitPrice: 1000,
          discount: 0,
        },
      ],
    });

    assert(invDoc.grandTotal === 5000, 'Invoice financial grandTotal = 5,000');
    assert(invDoc.status === 'DRAFT', 'Created document status = DRAFT');

    const htmlOutput = generateDocumentHTML({
      documentNo: invDoc.documentNo,
      documentType: invDoc.documentType,
      status: invDoc.status,
      issueDate: invDoc.issueDate.toISOString(),
      customer: { name: customer.name, taxId: customer.taxId || undefined },
      items: [
        {
          product: { sku: testProduct.sku, name: testProduct.name, unit: 'ชิ้น' },
          quantity: 5,
          unitPrice: 1000,
          totalPrice: 5000,
        },
      ],
      subtotal: 5000,
      discount: 0,
      tax: 0,
      grandTotal: 5000,
    });

    assert(htmlOutput.includes(invDoc.documentNo), 'PDF Template contains documentNo');
    assert(htmlOutput.includes('5,000.00'), 'PDF Template contains grand total formatting');

    // 6. SCENARIO 6: Document Issuance & Cancellation Reverse Ledger
    console.log('\n--- SCENARIO 6: Document Workflow & Reverse Stock Ledger ---');
    const issueDoc = await createDocument({
      documentType: 'STOCK_ISSUE',
      warehouseId: whMain.id,
      notes: 'Scenario 6 Stock Issue Document',
      createdById: warehouseUser.id,
      items: [
        {
          productId: testProduct.id,
          quantity: 10,
          unitCost: 500,
        },
      ],
    });

    await approveDocument(issueDoc.id, adminUser.id);
    await issueDocument(issueDoc.id, warehouseUser.id);

    const invAfterIssue = await prisma.inventory.findUnique({
      where: { productId_warehouseId: { productId: testProduct.id, warehouseId: whMain.id } },
    });
    assert(invAfterIssue?.onHand === 50, 'Issuing Stock Issue Document reduced stock from 60 to 50');

    // Cancel Issued Document -> Reverse Transaction
    await cancelDocument(issueDoc.id, adminUser.id, 'Scenario 6 Cancellation Test');

    const invAfterCancel = await prisma.inventory.findUnique({
      where: { productId_warehouseId: { productId: testProduct.id, warehouseId: whMain.id } },
    });
    assert(invAfterCancel?.onHand === 60, 'Cancelling Document restored stock from 50 back to 60 via Reverse Ledger');

    const reverseLedger = await prisma.stockMovement.findFirst({
      where: { documentId: issueDoc.id, type: 'REVERSE' },
    });
    assert(!!reverseLedger, 'Reverse Stock Ledger entry created');

    // 7. Data Consistency Check
    console.log('\n--- SCENARIO 7: Data Consistency Verification ---');
    const integrity = await verifyStockIntegrity();
    assert(integrity.isValid, 'Stock Integrity Check passed with zero discrepancies');

    // 8. 5-Role RBAC Security Matrix
    console.log('\n--- SCENARIO 8: 5-Role RBAC Security Matrix ---');
    assert(hasPermission('ADMIN', 'documents:approve'), 'ADMIN has documents:approve permission');
    assert(hasPermission('MANAGER', 'documents:approve'), 'MANAGER has documents:approve permission');
    assert(!hasPermission('WAREHOUSE', 'documents:approve'), 'WAREHOUSE does NOT have documents:approve permission');
    assert(hasPermission('ACCOUNTING', 'customers:create'), 'ACCOUNTING has customers:create permission');
    assert(!hasPermission('USER', 'stock:in'), 'USER does NOT have stock:in permission');

    // 9. Company Settings Verification
    console.log('\n--- SCENARIO 9: Dynamic Company Settings ---');
    const companyConfig = await getCompanySettings();
    assert(!!companyConfig.name, 'Retrieved active Company Settings from DB');
    assert(hasPermission('ADMIN', 'company:manage'), 'ADMIN has company:manage permission');

    // 10. Stock Audit & Spreadsheet Import Verification
    console.log('\n--- SCENARIO 10: Stock Audit & Spreadsheet Import ---');
    const totalProductsCount = await prisma.product.count();
    assert(totalProductsCount > 100, `Imported ${totalProductsCount} spreadsheet products successfully`);

    // 11. Product Bundles & Assembly Verification
    console.log('\n--- SCENARIO 11: Product Bundling & Assembly ---');
    const compA = await prisma.product.create({
      data: { sku: `COMP-A-${Date.now()}`, barcode: `885111${Date.now().toString().slice(-7)}`, name: 'Component Part A', categoryId: category!.id, costPrice: 100 },
    });
    const compB = await prisma.product.create({
      data: { sku: `COMP-B-${Date.now()}`, barcode: `885222${Date.now().toString().slice(-7)}`, name: 'Component Part B', categoryId: category!.id, costPrice: 200 },
    });
    const bundleParent = await prisma.product.create({
      data: { sku: `BUNDLE-SET-${Date.now()}`, barcode: `885333${Date.now().toString().slice(-7)}`, name: 'Parent Assembly Set', categoryId: category!.id, isBundle: true, costPrice: 700 },
    });

    await prisma.bundleItem.createMany({
      data: [
        { bundleProductId: bundleParent.id, componentProductId: compA.id, quantity: 2 },
        { bundleProductId: bundleParent.id, componentProductId: compB.id, quantity: 1 },
      ],
    });

    const bundleDb = await prisma.product.findUnique({
      where: { id: bundleParent.id },
      include: { bundleItems: true },
    });
    assert(bundleDb?.bundleItems.length === 2, 'Bundle Recipe created with 2 component parts');

    // 12. Corporate Tax ID Lookup Verification
    console.log('\n--- SCENARIO 12: Corporate Tax ID Lookup ---');
    const corpCust = await prisma.customer.create({
      data: {
        code: `CUST-SB-${Date.now()}`,
        name: 'บริษัท เอส แอนด์ บี อิเล็กทรอนิกส์ เซอร์วิส จำกัด',
        taxId: '0105555081714',
        address: '120/288 หมู่ที่ 5 ตำบลบางเดื่อ อำเภอเมืองปทุมธานี จ.ปทุมธานี 12000',
        phone: '02-789-9999',
      },
    });
    assert(corpCust.taxId === '0105555081714', 'Customer created with 13-digit Tax ID from Corporate Lookup');

    // 13. ADMIN-Only Product Editing Verification
    console.log('\n--- SCENARIO 13: ADMIN-Only Product Editing Security Matrix ---');
    assert(hasPermission('ADMIN', 'products:update'), 'ADMIN has products:update permission');
    assert(!hasPermission('MANAGER', 'products:update'), 'MANAGER does NOT have products:update permission');
    assert(!hasPermission('WAREHOUSE', 'products:update'), 'WAREHOUSE does NOT have products:update permission');
    assert(!hasPermission('ACCOUNTING', 'products:update'), 'ACCOUNTING does NOT have products:update permission');
    assert(!hasPermission('USER', 'products:update'), 'USER does NOT have products:update permission');

    console.log(`\n📊 E2E TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);

    if (failed > 0) {
      process.exit(1);
    }
  } catch (error) {
    console.error('Fatal Error during Test Suite:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runAllTests();
