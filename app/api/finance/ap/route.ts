import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';

    const where: any = {
      documentType: { in: ['PO', 'PR', 'GRN'] },
      status: { notIn: ['CANCELLED', 'VOID'] },
    };

    if (search) {
      where.OR = [
        { documentNo: { contains: search } },
        { supplier: { name: { contains: search } } },
      ];
    }

    const documents = await prisma.document.findMany({
      where,
      include: {
        supplier: true,
        payments: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const apItems = documents.map((doc) => {
      const totalPaid = doc.payments.reduce((acc, p) => acc + p.amount, 0);
      const dueAmount = Math.max(0, doc.grandTotal - totalPaid);
      let status = 'UNPAID';
      if (dueAmount === 0 && doc.grandTotal > 0) status = 'PAID';
      else if (totalPaid > 0) status = 'PARTIAL';

      return {
        id: doc.id,
        documentNo: doc.documentNo,
        documentType: doc.documentType,
        supplierName: doc.supplier?.name || 'ซัพพลายเออร์ทั่วไป',
        issueDate: doc.issueDate,
        grandTotal: doc.grandTotal,
        paidAmount: totalPaid,
        dueAmount,
        status,
      };
    });

    const summary = {
      totalAP: apItems.reduce((acc, i) => acc + i.grandTotal, 0),
      totalPaid: apItems.reduce((acc, i) => acc + i.paidAmount, 0),
      totalOutstanding: apItems.reduce((acc, i) => acc + i.dueAmount, 0),
      unpaidCount: apItems.filter((i) => i.status === 'UNPAID').length,
    };

    return NextResponse.json({ data: apItems, summary });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch AP' }, { status: 500 });
  }
}
