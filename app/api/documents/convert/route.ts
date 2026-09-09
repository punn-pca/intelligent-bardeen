import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { createAuditLog } from '@/lib/audit-logger';

export async function POST(req: NextRequest) {
  try {
    const userRole = req.headers.get('x-user-role') || 'ADMIN';
    if (!['ADMIN', 'MANAGER', 'SALE'].includes(userRole)) {
      return NextResponse.json({ error: 'Unauthorized: insufficient permission to convert document' }, { status: 403 });
    }

    const body = await req.json();
    const { sourceDocumentId, targetType, createdById } = body;

    if (!sourceDocumentId || !targetType) {
      return NextResponse.json({ error: 'sourceDocumentId and targetType are required' }, { status: 400 });
    }

    const userId = createdById || 'usr-admin';

    // 1. Fetch Source Document
    const sourceDoc = await prisma.document.findUnique({
      where: { id: sourceDocumentId },
      include: { items: true, customer: true },
    });

    if (!sourceDoc) {
      return NextResponse.json({ error: 'Source document not found' }, { status: 404 });
    }

    // 2. Validate Allowed Transition Rules
    const allowedTransitions: Record<string, string> = {
      'QUOTATION': 'SO',
      'SO': 'DELIVERY_NOTE',
      'DELIVERY_NOTE': 'INVOICE',
      'INVOICE': 'RECEIPT',
    };

    const expectedTarget = allowedTransitions[sourceDoc.documentType];
    if (!expectedTarget || expectedTarget !== targetType) {
      return NextResponse.json({
        error: `Invalid document chain transition: Cannot convert ${sourceDoc.documentType} to ${targetType}`
      }, { status: 400 });
    }

    // 3. Check for Duplicate Conversion
    const existingChild = await prisma.document.findFirst({
      where: {
        parentDocumentId: sourceDoc.id,
        documentType: targetType,
      },
    });

    if (existingChild) {
      return NextResponse.json({
        error: `Document ${sourceDoc.documentNo} has already been converted to ${existingChild.documentNo}`,
        existingDocument: existingChild,
      }, { status: 409 });
    }

    // 4. Generate Target Document Number (e.g. SO2609-00001, DO2609-00001, INV2609-00001, RC2609-00001)
    const yearMonth = new Date().toISOString().slice(2, 7).replace('-', '');
    const prefixMap: Record<string, string> = {
      'SO': 'SO',
      'DELIVERY_NOTE': 'DO',
      'INVOICE': 'INV',
      'RECEIPT': 'RC',
    };
    const prefix = prefixMap[targetType] || 'DOC';
    
    const count = await prisma.document.count({ where: { documentType: targetType } });
    const targetDocNo = `${prefix}${yearMonth}-${(count + 1).toString().padStart(5, '0')}`;

    // 5. Execute Atomic Server-Side Transaction
    const newDoc = await prisma.$transaction(async (tx) => {
      // Create Child Document with Parent Reference
      const child = await tx.document.create({
        data: {
          documentNo: targetDocNo,
          documentType: targetType,
          parentDocumentId: sourceDoc.id,
          parentDocumentNo: sourceDoc.documentNo,
          customerId: sourceDoc.customerId ? sourceDoc.customerId : null,
          supplierId: sourceDoc.supplierId ? sourceDoc.supplierId : null,
          warehouseId: sourceDoc.warehouseId ? sourceDoc.warehouseId : null,
          status: 'ISSUED',
          approvalStatus: 'APPROVED',
          paymentStatus: targetType === 'RECEIPT' ? 'PAID' : sourceDoc.paymentStatus,
          subtotal: sourceDoc.subtotal,
          discount: sourceDoc.discount,
          vatRate: sourceDoc.vatRate,
          vatAmount: sourceDoc.vatAmount,
          whtRate: sourceDoc.whtRate,
          whtAmount: sourceDoc.whtAmount,
          grandTotal: sourceDoc.grandTotal,
          paidAmount: targetType === 'RECEIPT' ? sourceDoc.grandTotal : 0,
          dueAmount: targetType === 'RECEIPT' ? 0 : sourceDoc.grandTotal,
          notes: `Converted from ${sourceDoc.documentNo}`,
          createdById: userId,
          items: {
            create: sourceDoc.items.map((item) => ({
              productId: item.productId,
              locationId: item.locationId,
              quantity: item.quantity,
              unitCost: item.unitCost,
              unitPrice: item.unitPrice,
              discount: item.discount,
              totalCost: item.totalCost,
              totalPrice: item.totalPrice,
            })),
          },
        },
        include: { items: true, customer: true, parentDocument: true },
      });

      // Update Parent Document Status if needed
      await tx.document.update({
        where: { id: sourceDoc.id },
        data: { status: 'COMPLETED' },
      });

      return child;
    });

    // 6. Audit Log
    await createAuditLog({
      userId,
      username: 'user',
      action: 'CONVERT_DOCUMENT',
      entity: 'Document',
      entityId: newDoc.id,
      beforeData: { sourceDocumentId: sourceDoc.id, sourceDocumentNo: sourceDoc.documentNo },
      afterData: { targetDocumentId: newDoc.id, targetDocumentNo: newDoc.documentNo, targetType },
    });

    return NextResponse.json(newDoc, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Document conversion failed' }, { status: 500 });
  }
}
