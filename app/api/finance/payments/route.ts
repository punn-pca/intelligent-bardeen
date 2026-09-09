import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { createAuditLog } from '@/lib/audit-logger';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { documentId, amount, paymentMethod, notes, createdById } = body;

    if (!documentId || !amount || parseFloat(amount) <= 0) {
      return NextResponse.json({ error: 'documentId and valid payment amount are required' }, { status: 400 });
    }

    const payAmount = parseFloat(amount);
    const userId = createdById || 'usr-admin';

    const document = await prisma.document.findUnique({
      where: { id: documentId },
      include: { payments: true },
    });

    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    const yearMonth = new Date().toISOString().slice(2, 7).replace('-', '');
    const payCount = await prisma.paymentTransaction.count();
    const paymentNo = `PAY${yearMonth}-${(payCount + 1).toString().padStart(5, '0')}`;

    const paymentType = ['INVOICE', 'DELIVERY_NOTE', 'SO', 'QUOTATION'].includes(document.documentType)
      ? 'RECEIPT'
      : 'PAYMENT_VOUCHER';

    const result = await prisma.$transaction(async (tx) => {
      // 1. Create Payment Transaction
      const payment = await tx.paymentTransaction.create({
        data: {
          paymentNo,
          type: paymentType,
          documentId,
          customerId: document.customerId,
          supplierId: document.supplierId,
          amount: payAmount,
          paymentMethod: paymentMethod || 'BANK_TRANSFER',
          notes,
          createdById: userId,
        },
      });

      // 2. Recalculate document paid & due amounts
      const allPayments = await tx.paymentTransaction.findMany({
        where: { documentId },
      });

      const totalPaid = allPayments.reduce((acc, p) => acc + p.amount, 0);
      const dueAmount = Math.max(0, document.grandTotal - totalPaid);
      let paymentStatus = 'UNPAID';
      if (dueAmount === 0 && document.grandTotal > 0) paymentStatus = 'PAID';
      else if (totalPaid > 0) paymentStatus = 'PARTIAL';

      await tx.document.update({
        where: { id: documentId },
        data: {
          paidAmount: totalPaid,
          dueAmount,
          paymentStatus,
        },
      });

      return payment;
    });

    await createAuditLog({
      userId,
      username: 'admin',
      action: 'RECORD_PAYMENT',
      entity: 'PaymentTransaction',
      entityId: result.id,
      afterData: { paymentNo, documentId, amount: payAmount },
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Payment recording failed' }, { status: 500 });
  }
}
