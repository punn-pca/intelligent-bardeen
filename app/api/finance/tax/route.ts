import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const documents = await prisma.document.findMany({
      where: {
        status: { notIn: ['CANCELLED', 'VOID'] },
      },
      include: {
        customer: true,
        supplier: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    // Output VAT (Sales Documents: INVOICE, DELIVERY_NOTE, SO)
    const salesDocs = documents.filter((d) => ['INVOICE', 'DELIVERY_NOTE', 'SO'].includes(d.documentType));
    const outputVatTotal = salesDocs.reduce((acc, d) => acc + (d.grandTotal * 0.07) / 1.07, 0);

    // Input VAT (Purchase Documents: PO, GRN)
    const purchaseDocs = documents.filter((d) => ['PO', 'GRN'].includes(d.documentType));
    const inputVatTotal = purchaseDocs.reduce((acc, d) => acc + (d.grandTotal * 0.07) / 1.07, 0);

    const netVatPayable = outputVatTotal - inputVatTotal;

    return NextResponse.json({
      salesDocsCount: salesDocs.length,
      purchaseDocsCount: purchaseDocs.length,
      outputVatTotal,
      inputVatTotal,
      netVatPayable,
      companyTaxId: '0105555081714',
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch Tax report' }, { status: 500 });
  }
}
