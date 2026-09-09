import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';

    const where: any = {
      documentType: { in: ['INVOICE', 'DELIVERY_NOTE', 'SO', 'QUOTATION'] },
      status: { notIn: ['CANCELLED', 'VOID'] },
    };

    if (search) {
      where.OR = [
        { documentNo: { contains: search } },
        { customer: { name: { contains: search } } },
      ];
    }

    const documents = await prisma.document.findMany({
      where,
      include: {
        customer: true,
        payments: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const arItems = documents.map((doc) => {
      const totalPaid = doc.payments.reduce((acc, p) => acc + p.amount, 0);
      const dueAmount = Math.max(0, doc.grandTotal - totalPaid);
      let status = 'UNPAID';
      if (dueAmount === 0 && doc.grandTotal > 0) status = 'PAID';
      else if (totalPaid > 0) status = 'PARTIAL';

      return {
        id: doc.id,
        documentNo: doc.documentNo,
        documentType: doc.documentType,
        customerName: doc.customer?.name || 'ลูกค้าทั่วไป',
        issueDate: doc.issueDate,
        dueDate: doc.dueDate || doc.issueDate,
        grandTotal: doc.grandTotal,
        paidAmount: totalPaid,
        dueAmount,
        status,
      };
    });

    const summary = {
      totalAR: arItems.reduce((acc, i) => acc + i.grandTotal, 0),
      totalPaid: arItems.reduce((acc, i) => acc + i.paidAmount, 0),
      totalOutstanding: arItems.reduce((acc, i) => acc + i.dueAmount, 0),
      unpaidCount: arItems.filter((i) => i.status === 'UNPAID').length,
    };

    return NextResponse.json({ data: arItems, summary });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch AR' }, { status: 500 });
  }
}
