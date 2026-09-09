import { prisma } from '@/lib/db';
import { recordAuditLog } from '@/lib/audit-logger';

export type MovementType =
  | 'RECEIVE'
  | 'ISSUE'
  | 'TRANSFER_IN'
  | 'TRANSFER_OUT'
  | 'ADJUST_IN'
  | 'ADJUST_OUT'
  | 'RETURN_IN'
  | 'RETURN_OUT'
  | 'REVERSE'
  | 'STOCK_IN'
  | 'STOCK_OUT';

export interface ProcessStockInInput {
  productId: string;
  warehouseId: string;
  locationId?: string;
  quantity: number;
  costPrice?: number;
  lotNumber?: string;
  reference?: string;
  reason?: string;
  createdById: string;
  username: string;
  idempotencyKey?: string;
}

export interface ProcessStockOutInput {
  productId: string;
  warehouseId: string;
  locationId?: string;
  quantity: number;
  reference?: string;
  reason?: string;
  requestedBy?: string;
  createdById: string;
  username: string;
  idempotencyKey?: string;
}

export interface ProcessStockTransferInput {
  productId: string;
  sourceWarehouseId: string;
  destinationWarehouseId: string;
  quantity: number;
  reference?: string;
  note?: string;
  createdById: string;
  username: string;
  idempotencyKey?: string;
}

export interface ProcessStockAdjustmentInput {
  productId: string;
  warehouseId: string;
  locationId?: string;
  actualStock: number;
  reason: string;
  note?: string;
  createdById: string;
  username: string;
}

export async function processStockIn(input: ProcessStockInInput) {
  if (input.quantity <= 0) {
    throw new Error('Quantity must be greater than 0');
  }

  return await prisma.$transaction(async (tx) => {
    // Idempotency check if reference or idempotencyKey provided
    if (input.reference || input.idempotencyKey) {
      const ref = input.idempotencyKey || input.reference;
      const existingTx = await tx.stockTransaction.findFirst({
        where: { reference: ref, type: 'STOCK_IN' },
      });
      if (existingTx) {
        const existingMov = await tx.stockMovement.findFirst({
          where: { transactionId: existingTx.id },
          include: { product: true, warehouse: true },
        });
        return {
          transactionId: existingTx.id,
          movement: existingMov,
          product: existingMov?.product,
          warehouse: existingMov?.warehouse,
          quantity: input.quantity,
          isDuplicate: true,
        };
      }
    }

    const product = await tx.product.findUnique({ where: { id: input.productId } });
    if (!product) throw new Error('Product not found');

    const warehouse = await tx.warehouse.findUnique({ where: { id: input.warehouseId } });
    if (!warehouse) throw new Error('Warehouse not found');

    const unitCost = input.costPrice ?? product.costPrice;
    const totalCost = input.quantity * unitCost;

    const inventory = await tx.inventory.findUnique({
      where: { productId_warehouseId: { productId: input.productId, warehouseId: input.warehouseId } },
    });

    const beforeOnHand = inventory ? inventory.onHand : 0;
    const afterOnHand = beforeOnHand + input.quantity;

    await tx.inventory.upsert({
      where: { productId_warehouseId: { productId: input.productId, warehouseId: input.warehouseId } },
      update: { onHand: { increment: input.quantity } },
      create: { productId: input.productId, warehouseId: input.warehouseId, onHand: input.quantity, reserved: 0 },
    });

    const transactionId = `TX-IN-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

    await tx.stockTransaction.create({
      data: {
        id: transactionId,
        type: 'STOCK_IN',
        reference: input.idempotencyKey || input.reference,
        note: input.reason,
        createdById: input.createdById,
        items: {
          create: [{
            productId: input.productId,
            warehouseId: input.warehouseId,
            quantity: input.quantity,
            costPrice: unitCost,
            lotNumber: input.lotNumber,
            reason: input.reason,
          }],
        },
      },
    });

    const movement = await tx.stockMovement.create({
      data: {
        transactionId,
        type: 'RECEIVE',
        productId: input.productId,
        warehouseId: input.warehouseId,
        locationId: input.locationId,
        quantity: input.quantity,
        unitCost,
        totalCost,
        beforeOnHand,
        afterOnHand,
        createdById: input.createdById,
        reference: input.reference,
        reason: input.reason || 'Stock In Transaction',
      },
    });

    await recordAuditLog(
      {
        userId: input.createdById,
        username: input.username,
        action: 'STOCK_IN',
        entity: 'Inventory',
        entityId: `${input.productId}-${input.warehouseId}`,
        beforeData: JSON.stringify({ onHand: beforeOnHand }),
        afterData: JSON.stringify({ onHand: afterOnHand, quantity: input.quantity, transactionId }),
      },
      tx
    );

    return { transactionId, movement, product, warehouse, quantity: input.quantity };
  }, { timeout: 20000 });
}

export async function processStockOut(input: ProcessStockOutInput) {
  if (input.quantity <= 0) {
    throw new Error('Quantity must be greater than 0');
  }

  return await prisma.$transaction(async (tx) => {
    // Idempotency check if reference or idempotencyKey provided
    if (input.reference || input.idempotencyKey) {
      const ref = input.idempotencyKey || input.reference;
      const existingTx = await tx.stockTransaction.findFirst({
        where: { reference: ref, type: 'STOCK_OUT' },
      });
      if (existingTx) {
        const existingMov = await tx.stockMovement.findFirst({
          where: { transactionId: existingTx.id },
          include: { product: true, warehouse: true },
        });
        return {
          transactionId: existingTx.id,
          movement: existingMov,
          product: existingMov?.product,
          warehouse: existingMov?.warehouse,
          quantity: input.quantity,
          isDuplicate: true,
        };
      }
    }

    const product = await tx.product.findUnique({ where: { id: input.productId } });
    if (!product) throw new Error('Product not found');

    const warehouse = await tx.warehouse.findUnique({ where: { id: input.warehouseId } });
    if (!warehouse) throw new Error('Warehouse not found');

    const inventory = await tx.inventory.findUnique({
      where: { productId_warehouseId: { productId: input.productId, warehouseId: input.warehouseId } },
    });

    const beforeOnHand = inventory ? inventory.onHand : 0;
    const reserved = inventory ? inventory.reserved : 0;
    const availableStock = beforeOnHand - reserved;

    if (availableStock < input.quantity) {
      throw new Error(`Insufficient stock: Available ${availableStock}, Requested ${input.quantity}`);
    }

    const afterOnHand = beforeOnHand - input.quantity;

    // Atomic decrement
    await tx.inventory.update({
      where: { productId_warehouseId: { productId: input.productId, warehouseId: input.warehouseId } },
      data: { onHand: { decrement: input.quantity } },
    });

    const transactionId = `TX-OUT-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

    await tx.stockTransaction.create({
      data: {
        id: transactionId,
        type: 'STOCK_OUT',
        reference: input.idempotencyKey || input.reference,
        note: input.reason,
        createdById: input.createdById,
        items: {
          create: [{
            productId: input.productId,
            warehouseId: input.warehouseId,
            quantity: input.quantity,
            costPrice: product.costPrice,
            reason: input.reason,
          }],
        },
      },
    });

    const movement = await tx.stockMovement.create({
      data: {
        transactionId,
        type: 'ISSUE',
        productId: input.productId,
        warehouseId: input.warehouseId,
        locationId: input.locationId,
        quantity: -input.quantity,
        unitCost: product.costPrice,
        totalCost: -(input.quantity * product.costPrice),
        beforeOnHand,
        afterOnHand,
        createdById: input.createdById,
        reference: input.reference,
        reason: input.reason || 'Stock Out Transaction',
      },
    });

    await recordAuditLog(
      {
        userId: input.createdById,
        username: input.username,
        action: 'STOCK_OUT',
        entity: 'Inventory',
        entityId: `${input.productId}-${input.warehouseId}`,
        beforeData: JSON.stringify({ onHand: beforeOnHand }),
        afterData: JSON.stringify({ onHand: afterOnHand, quantity: input.quantity, transactionId }),
      },
      tx
    );

    return { transactionId, movement, product, warehouse, quantity: input.quantity };
  }, { timeout: 20000 });
}

export async function processStockTransfer(input: ProcessStockTransferInput) {
  if (input.quantity <= 0) throw new Error('Quantity must be greater than 0');
  if (input.sourceWarehouseId === input.destinationWarehouseId) {
    throw new Error('Source and Destination warehouses must be different');
  }

  return await prisma.$transaction(async (tx) => {
    if (input.reference || input.idempotencyKey) {
      const ref = input.idempotencyKey || input.reference;
      const existingTx = await tx.stockTransaction.findFirst({
        where: { reference: ref, type: 'TRANSFER' },
      });
      if (existingTx) {
        return {
          transactionId: existingTx.id,
          isDuplicate: true,
        };
      }
    }

    const product = await tx.product.findUnique({ where: { id: input.productId } });
    if (!product) throw new Error('Product not found');

    const sourceWh = await tx.warehouse.findUnique({ where: { id: input.sourceWarehouseId } });
    const destWh = await tx.warehouse.findUnique({ where: { id: input.destinationWarehouseId } });
    if (!sourceWh || !destWh) throw new Error('Warehouse not found');

    const srcInv = await tx.inventory.findUnique({
      where: { productId_warehouseId: { productId: input.productId, warehouseId: input.sourceWarehouseId } },
    });

    const srcBefore = srcInv ? srcInv.onHand : 0;
    const srcAvailable = srcBefore - (srcInv ? srcInv.reserved : 0);

    if (srcAvailable < input.quantity) {
      throw new Error(`Insufficient stock in source warehouse: Available ${srcAvailable}, Requested ${input.quantity}`);
    }

    const srcAfter = srcBefore - input.quantity;

    // Atomic decrement source
    await tx.inventory.update({
      where: { productId_warehouseId: { productId: input.productId, warehouseId: input.sourceWarehouseId } },
      data: { onHand: { decrement: input.quantity } },
    });

    const destInv = await tx.inventory.findUnique({
      where: { productId_warehouseId: { productId: input.productId, warehouseId: input.destinationWarehouseId } },
    });
    const destBefore = destInv ? destInv.onHand : 0;
    const destAfter = destBefore + input.quantity;

    // Atomic increment destination
    await tx.inventory.upsert({
      where: { productId_warehouseId: { productId: input.productId, warehouseId: input.destinationWarehouseId } },
      update: { onHand: { increment: input.quantity } },
      create: { productId: input.productId, warehouseId: input.destinationWarehouseId, onHand: input.quantity, reserved: 0 },
    });

    const transactionId = `TX-TR-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

    await tx.stockTransaction.create({
      data: {
        id: transactionId,
        type: 'TRANSFER',
        reference: input.idempotencyKey || input.reference,
        note: input.note,
        createdById: input.createdById,
        transfers: {
          create: [{
            sourceWarehouseId: input.sourceWarehouseId,
            destinationWarehouseId: input.destinationWarehouseId,
            productId: input.productId,
            quantity: input.quantity,
            createdById: input.createdById,
          }],
        },
      },
    });

    const movementOut = await tx.stockMovement.create({
      data: {
        transactionId,
        type: 'TRANSFER_OUT',
        productId: input.productId,
        warehouseId: input.sourceWarehouseId,
        quantity: -input.quantity,
        unitCost: product.costPrice,
        totalCost: -(input.quantity * product.costPrice),
        beforeOnHand: srcBefore,
        afterOnHand: srcAfter,
        createdById: input.createdById,
        reference: input.reference,
        reason: input.note || `Transfer to ${destWh.code}`,
      },
    });

    const movementIn = await tx.stockMovement.create({
      data: {
        transactionId,
        type: 'TRANSFER_IN',
        productId: input.productId,
        warehouseId: input.destinationWarehouseId,
        quantity: input.quantity,
        unitCost: product.costPrice,
        totalCost: input.quantity * product.costPrice,
        beforeOnHand: destBefore,
        afterOnHand: destAfter,
        createdById: input.createdById,
        reference: input.reference,
        reason: input.note || `Transfer from ${sourceWh.code}`,
      },
    });

    return { transactionId, product, sourceWarehouse: sourceWh, destWarehouse: destWh, quantity: input.quantity };
  }, { timeout: 20000 });
}

export async function processStockAdjustment(input: ProcessStockAdjustmentInput) {
  if (!input.reason || input.reason.trim().length === 0) {
    throw new Error('Reason is required for stock adjustment');
  }
  if (input.actualStock < 0) {
    throw new Error('Actual stock cannot be negative');
  }

  return await prisma.$transaction(async (tx) => {
    const product = await tx.product.findUnique({ where: { id: input.productId } });
    if (!product) throw new Error('Product not found');

    const warehouse = await tx.warehouse.findUnique({ where: { id: input.warehouseId } });
    if (!warehouse) throw new Error('Warehouse not found');

    const inventory = await tx.inventory.findUnique({
      where: { productId_warehouseId: { productId: input.productId, warehouseId: input.warehouseId } },
    });

    const currentStock = inventory ? inventory.onHand : 0;
    const adjustmentQty = input.actualStock - currentStock;

    await tx.inventory.upsert({
      where: { productId_warehouseId: { productId: input.productId, warehouseId: input.warehouseId } },
      update: { onHand: input.actualStock },
      create: { productId: input.productId, warehouseId: input.warehouseId, onHand: input.actualStock, reserved: 0 },
    });

    const transactionId = `TX-ADJ-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

    await tx.stockTransaction.create({
      data: {
        id: transactionId,
        type: 'ADJUSTMENT',
        reference: input.note,
        note: input.reason,
        createdById: input.createdById,
        adjustments: {
          create: [{
            productId: input.productId,
            warehouseId: input.warehouseId,
            currentStock,
            actualStock: input.actualStock,
            adjustmentQty,
            reason: input.reason,
            note: input.note,
            createdById: input.createdById,
          }],
        },
      },
    });

    const movementType = adjustmentQty >= 0 ? 'ADJUST_IN' : 'ADJUST_OUT';
    const movement = await tx.stockMovement.create({
      data: {
        transactionId,
        type: movementType,
        productId: input.productId,
        warehouseId: input.warehouseId,
        locationId: input.locationId,
        quantity: adjustmentQty,
        unitCost: product.costPrice,
        totalCost: adjustmentQty * product.costPrice,
        beforeOnHand: currentStock,
        afterOnHand: input.actualStock,
        createdById: input.createdById,
        reason: input.reason,
      },
    });

    return { transactionId, movement, product, warehouse, currentStock, actualStock: input.actualStock, adjustmentQty };
  }, { timeout: 20000 });
}

export async function verifyStockIntegrity() {
  const inventories = await prisma.inventory.findMany({
    include: { product: true, warehouse: true },
  });

  const discrepancies = [];

  for (const inv of inventories) {
    const movements = await prisma.stockMovement.findMany({
      where: { productId: inv.productId, warehouseId: inv.warehouseId },
    });

    const calculatedOnHand = movements.reduce((acc, curr) => acc + curr.quantity, 0);

    if (Math.abs(calculatedOnHand - inv.onHand) > 0.0001) {
      discrepancies.push({
        productId: inv.productId,
        productName: inv.product.name,
        productSku: inv.product.sku,
        warehouseId: inv.warehouseId,
        warehouseCode: inv.warehouse.code,
        currentOnHand: inv.onHand,
        calculatedOnHand,
        diff: inv.onHand - calculatedOnHand,
      });
    }
  }

  return {
    isValid: discrepancies.length === 0,
    totalAudited: inventories.length,
    discrepanciesCount: discrepancies.length,
    discrepancies,
  };
}
