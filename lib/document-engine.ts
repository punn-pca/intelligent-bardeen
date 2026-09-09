import { prisma } from '@/lib/db';
import { recordAuditLog } from '@/lib/audit-logger';

export type DocumentType =
  | 'PR'
  | 'PO'
  | 'GRN'
  | 'QUOTATION'
  | 'SO'
  | 'DELIVERY_NOTE'
  | 'STOCK_ISSUE'
  | 'STOCK_TRANSFER'
  | 'STOCK_ADJUSTMENT'
  | 'STOCK_RETURN'
  | 'INVOICE'
  | 'RECEIPT'
  | 'PAYMENT_VOUCHER'
  | 'CREDIT_NOTE'
  | 'DEBIT_NOTE';

export type DocumentStatus =
  | 'DRAFT'
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'ISSUED'
  | 'CANCELLED';

const PREFIX_MAP: Record<DocumentType, string> = {
  PR: 'PR',
  PO: 'PO',
  GRN: 'GRN',
  QUOTATION: 'QT',
  SO: 'SO',
  DELIVERY_NOTE: 'DN',
  STOCK_ISSUE: 'ISS',
  STOCK_TRANSFER: 'TRF',
  STOCK_ADJUSTMENT: 'ADJ',
  STOCK_RETURN: 'RET',
  INVOICE: 'INV',
  RECEIPT: 'RC',
  PAYMENT_VOUCHER: 'PV',
  CREDIT_NOTE: 'CN',
  DEBIT_NOTE: 'DN',
};

/**
 * Generate a transaction-safe document number (e.g. PO-2026-000001)
 */
export async function generateDocumentNumber(
  type: DocumentType,
  tx?: any
): Promise<string> {
  const client = tx || prisma;
  const prefix = PREFIX_MAP[type] || 'DOC';
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  const seq = await client.documentSequence.upsert({
    where: { prefix_year: { prefix, year } },
    update: {
      lastSequence: { increment: 1 },
    },
    create: {
      prefix,
      year,
      month,
      lastSequence: 1,
    },
  });

  const paddedSeq = seq.lastSequence.toString().padStart(6, '0');
  return `${prefix}-${year}-${paddedSeq}`;
}

export interface CreateDocumentItemInput {
  productId: string;
  locationId?: string;
  quantity: number;
  unitCost?: number;
  unitPrice?: number;
  discount?: number;
}

export interface CreateDocumentInput {
  documentType: DocumentType;
  issueDate?: Date;
  customerId?: string;
  supplierId?: string;
  warehouseId?: string;
  targetWarehouseId?: string;
  refDocumentNo?: string;
  discount?: number;
  tax?: number;
  notes?: string;
  status?: DocumentStatus;
  items: CreateDocumentItemInput[];
  createdById: string;
}

/**
 * Create a new Document
 */
export async function createDocument(input: CreateDocumentInput) {
  return await prisma.$transaction(async (tx) => {
    const documentNo = await generateDocumentNumber(input.documentType, tx);

    let subtotal = 0;
    const itemsData = input.items.map((item) => {
      const uCost = item.unitCost ?? 0;
      const uPrice = item.unitPrice ?? uCost;
      const disc = item.discount ?? 0;
      const tCost = item.quantity * uCost;
      const tPrice = item.quantity * uPrice - disc;
      subtotal += tPrice;

      return {
        productId: item.productId,
        locationId: item.locationId,
        quantity: item.quantity,
        unitCost: uCost,
        unitPrice: uPrice,
        discount: disc,
        totalCost: tCost,
        totalPrice: tPrice,
      };
    });

    const discTotal = input.discount ?? 0;
    const taxTotal = input.tax ?? 0;
    const grandTotal = subtotal - discTotal + taxTotal;
    const initialStatus = input.status || 'DRAFT';

    const document = await tx.document.create({
      data: {
        documentNo,
        documentType: input.documentType,
        status: initialStatus,
        issueDate: input.issueDate || new Date(),
        customerId: input.customerId ? input.customerId : null,
        supplierId: input.supplierId ? input.supplierId : null,
        warehouseId: input.warehouseId ? input.warehouseId : null,
        targetWarehouseId: input.targetWarehouseId ? input.targetWarehouseId : null,
        refDocumentNo: input.refDocumentNo || null,
        subtotal,
        discount: discTotal,
        vatRate: 7.0,
        vatAmount: taxTotal,
        grandTotal,
        notes: input.notes || null,
        createdById: input.createdById || 'usr-admin',
        items: {
          create: itemsData,
        },
      },
      include: {
        items: {
          include: { product: true, location: true },
        },
        supplier: true,
        customer: true,
        warehouse: true,
        targetWarehouse: true,
        createdBy: { select: { id: true, name: true, username: true } },
      },
    });

    await recordAuditLog(
      {
        userId: input.createdById,
        username: document.createdBy.username,
        action: 'CREATE_DOCUMENT',
        entity: 'Document',
        entityId: document.id,
        afterData: JSON.stringify({ documentNo, type: input.documentType, grandTotal }),
      },
      tx
    );

    return document;
  }, { timeout: 20000 });
}

/**
 * Approve Document
 */
export async function approveDocument(documentId: string, approvedById: string) {
  return await prisma.$transaction(async (tx) => {
    const doc = await tx.document.findUnique({
      where: { id: documentId },
      include: { createdBy: true },
    });

    if (!doc) throw new Error('Document not found');
    if (doc.status === 'CANCELLED') throw new Error('Cannot approve cancelled document');
    if (doc.status === 'APPROVED' || doc.status === 'ISSUED') {
      return doc;
    }

    const updated = await tx.document.update({
      where: { id: documentId },
      data: {
        status: 'APPROVED',
        approvedById,
      },
    });

    await recordAuditLog(
      {
        userId: approvedById,
        username: 'approver',
        action: 'APPROVE_DOCUMENT',
        entity: 'Document',
        entityId: documentId,
        beforeData: JSON.stringify({ status: doc.status }),
        afterData: JSON.stringify({ status: 'APPROVED' }),
      },
      tx
    );

    return updated;
  }, { timeout: 20000 });
}

/**
 * Issue Document and trigger Stock Movement / Ledger entries if stock-impacting
 */
export async function issueDocument(documentId: string, userId: string) {
  return await prisma.$transaction(async (tx) => {
    const doc = await tx.document.findUnique({
      where: { id: documentId },
      include: {
        items: { include: { product: true } },
        warehouse: true,
        targetWarehouse: true,
        createdBy: true,
      },
    });

    if (!doc) throw new Error('Document not found');
    if (doc.status === 'CANCELLED') throw new Error('Cannot issue cancelled document');
    if (doc.status === 'ISSUED') return doc;
    if (doc.status !== 'APPROVED') {
      throw new Error(`Document ${doc.documentNo} must be APPROVED before it can be issued (current status: ${doc.status})`);
    }

    // Execute Stock Movements for stock-impacting document types
    if (['GRN', 'STOCK_ISSUE', 'STOCK_TRANSFER', 'STOCK_ADJUSTMENT', 'STOCK_RETURN', 'DELIVERY_NOTE'].includes(doc.documentType)) {
      if (!doc.warehouseId) throw new Error('Primary Warehouse is required for stock document');

      for (const item of doc.items) {
        const inv = await tx.inventory.findUnique({
          where: { productId_warehouseId: { productId: item.productId, warehouseId: doc.warehouseId } },
        });

        const currentOnHand = inv ? inv.onHand : 0;
        let newOnHand = currentOnHand;
        let movementType = 'RECEIVE';

        if (doc.documentType === 'GRN' || (doc.documentType === 'STOCK_RETURN' && !doc.targetWarehouseId)) {
          newOnHand = currentOnHand + item.quantity;
          movementType = 'RECEIVE';
        } else if (['STOCK_ISSUE', 'DELIVERY_NOTE'].includes(doc.documentType)) {
          if (currentOnHand < item.quantity) {
            throw new Error(`Insufficient stock for product ${item.product.sku}: Available ${currentOnHand}, Needed ${item.quantity}`);
          }
          newOnHand = currentOnHand - item.quantity;
          movementType = 'ISSUE';
        } else if (doc.documentType === 'STOCK_TRANSFER') {
          if (!doc.targetWarehouseId) throw new Error('Target Warehouse required for transfer');
          if (currentOnHand < item.quantity) {
            throw new Error(`Insufficient stock for transfer ${item.product.sku}`);
          }

          // Primary Warehouse Out
          newOnHand = currentOnHand - item.quantity;
          await tx.inventory.upsert({
            where: { productId_warehouseId: { productId: item.productId, warehouseId: doc.warehouseId } },
            update: { onHand: newOnHand },
            create: { productId: item.productId, warehouseId: doc.warehouseId, onHand: newOnHand, reserved: 0 },
          });

          await tx.stockMovement.create({
            data: {
              documentId: doc.id,
              type: 'TRANSFER_OUT',
              productId: item.productId,
              warehouseId: doc.warehouseId,
              locationId: item.locationId,
              quantity: -item.quantity,
              unitCost: item.unitCost,
              totalCost: item.totalCost,
              beforeOnHand: currentOnHand,
              afterOnHand: newOnHand,
              createdById: userId,
              reference: doc.documentNo,
              reason: doc.notes || 'Stock Transfer Out',
            },
          });

          // Target Warehouse In
          const destInv = await tx.inventory.findUnique({
            where: { productId_warehouseId: { productId: item.productId, warehouseId: doc.targetWarehouseId } },
          });
          const destCurrent = destInv ? destInv.onHand : 0;
          const destNew = destCurrent + item.quantity;

          await tx.inventory.upsert({
            where: { productId_warehouseId: { productId: item.productId, warehouseId: doc.targetWarehouseId } },
            update: { onHand: destNew },
            create: { productId: item.productId, warehouseId: doc.targetWarehouseId, onHand: destNew, reserved: 0 },
          });

          await tx.stockMovement.create({
            data: {
              documentId: doc.id,
              type: 'TRANSFER_IN',
              productId: item.productId,
              warehouseId: doc.targetWarehouseId,
              locationId: item.locationId,
              quantity: item.quantity,
              unitCost: item.unitCost,
              totalCost: item.totalCost,
              beforeOnHand: destCurrent,
              afterOnHand: destNew,
              createdById: userId,
              reference: doc.documentNo,
              reason: doc.notes || 'Stock Transfer In',
            },
          });

          continue; // Handled transfer
        } else if (doc.documentType === 'STOCK_ADJUSTMENT') {
          movementType = item.quantity >= 0 ? 'ADJUST_IN' : 'ADJUST_OUT';
          newOnHand = currentOnHand + item.quantity;
          if (newOnHand < 0) throw new Error('Stock cannot be negative after adjustment');
        }

        // Update inventory
        await tx.inventory.upsert({
          where: { productId_warehouseId: { productId: item.productId, warehouseId: doc.warehouseId } },
          update: { onHand: newOnHand },
          create: { productId: item.productId, warehouseId: doc.warehouseId, onHand: newOnHand, reserved: 0 },
        });

        // Record Stock Movement / Ledger
        await tx.stockMovement.create({
          data: {
            documentId: doc.id,
            type: movementType,
            productId: item.productId,
            warehouseId: doc.warehouseId,
            locationId: item.locationId,
            quantity: movementType === 'ISSUE' || movementType === 'ADJUST_OUT' ? -Math.abs(item.quantity) : Math.abs(item.quantity),
            unitCost: item.unitCost,
            totalCost: item.totalCost,
            beforeOnHand: currentOnHand,
            afterOnHand: newOnHand,
            createdById: userId,
            reference: doc.documentNo,
            reason: doc.notes || `Document ${doc.documentNo} Issued`,
          },
        });
      }
    }

    const updated = await tx.document.update({
      where: { id: documentId },
      data: { status: 'ISSUED' },
    });

    await recordAuditLog(
      {
        userId,
        username: doc.createdBy.username,
        action: 'ISSUE_DOCUMENT',
        entity: 'Document',
        entityId: documentId,
        afterData: JSON.stringify({ documentNo: doc.documentNo, status: 'ISSUED' }),
      },
      tx
    );

    return updated;
  }, { timeout: 20000 });
}

/**
 * Cancel Document & perform Reverse Transactions if previously ISSUED
 */
export async function cancelDocument(documentId: string, userId: string, reason?: string) {
  return await prisma.$transaction(async (tx) => {
    const doc = await tx.document.findUnique({
      where: { id: documentId },
      include: {
        items: { include: { product: true } },
        movements: true,
        createdBy: true,
      },
    });

    if (!doc) throw new Error('Document not found');
    if (doc.status === 'CANCELLED') return doc;

    // Reverse Stock Movements if Document was ISSUED
    if (doc.status === 'ISSUED' && doc.movements.length > 0) {
      for (const mov of doc.movements) {
        const inv = await tx.inventory.findUnique({
          where: { productId_warehouseId: { productId: mov.productId, warehouseId: mov.warehouseId } },
        });
        const currentOnHand = inv ? inv.onHand : 0;
        const reverseQty = -mov.quantity; // Exact reverse of original movement quantity
        const newOnHand = currentOnHand + reverseQty;

        if (newOnHand < 0) {
          throw new Error(`Cannot cancel document ${doc.documentNo}: Reversing movement for ${mov.productId} causes negative stock (${newOnHand})`);
        }

        await tx.inventory.upsert({
          where: { productId_warehouseId: { productId: mov.productId, warehouseId: mov.warehouseId } },
          update: { onHand: newOnHand },
          create: { productId: mov.productId, warehouseId: mov.warehouseId, onHand: newOnHand, reserved: 0 },
        });

        await tx.stockMovement.create({
          data: {
            documentId: doc.id,
            type: 'REVERSE',
            productId: mov.productId,
            warehouseId: mov.warehouseId,
            locationId: mov.locationId,
            quantity: reverseQty,
            unitCost: mov.unitCost,
            totalCost: -mov.totalCost,
            beforeOnHand: currentOnHand,
            afterOnHand: newOnHand,
            createdById: userId,
            reference: `REVERSE-${doc.documentNo}`,
            reason: reason || `Cancelled Document ${doc.documentNo}`,
          },
        });
      }
    }

    const updated = await tx.document.update({
      where: { id: documentId },
      data: { status: 'CANCELLED' },
    });

    await recordAuditLog(
      {
        userId,
        username: doc.createdBy.username,
        action: 'CANCEL_DOCUMENT',
        entity: 'Document',
        entityId: documentId,
        beforeData: JSON.stringify({ status: doc.status }),
        afterData: JSON.stringify({ status: 'CANCELLED', reason }),
      },
      tx
    );

    return updated;
  }, { timeout: 20000 });
}
