import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get('q') || '';

    if (!q || q.trim().length === 0) {
      return NextResponse.json({ products: [], transactions: [] });
    }

    const query = q.trim();

    const [products, transactions] = await Promise.all([
      prisma.product.findMany({
        where: {
          isDeleted: false,
          OR: [
            { sku: { contains: query } },
            { barcode: { contains: query } },
            { name: { contains: query } },
          ],
        },
        include: {
          category: true,
          inventories: { include: { warehouse: true } },
        },
        take: 10,
      }),
      prisma.stockTransaction.findMany({
        where: {
          OR: [
            { id: { contains: query } },
            { reference: { contains: query } },
          ],
        },
        include: {
          createdBy: { select: { name: true } },
          movements: {
            include: { product: true, warehouse: true },
          },
        },
        take: 10,
      }),
    ]);

    const formattedProducts = products.map((p) => ({
      type: 'PRODUCT',
      id: p.id,
      title: `${p.sku} - ${p.name}`,
      subtitle: `Barcode: ${p.barcode} | หมวดหมู่: ${p.category.name}`,
      onHand: p.inventories.reduce((acc, i) => acc + i.onHand, 0),
      url: `/products/${p.id}`,
    }));

    const formattedTransactions = transactions.map((t) => ({
      type: 'TRANSACTION',
      id: t.id,
      title: `Transaction: ${t.id} (${t.type})`,
      subtitle: `โดย: ${t.createdBy.name} | Ref: ${t.reference || '-'} | วันที่: ${new Date(t.createdAt).toLocaleString('th-TH')}`,
      url: `/movements?search=${t.id}`,
    }));

    return NextResponse.json({
      products: formattedProducts,
      transactions: formattedTransactions,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Search failed' }, { status: 500 });
  }
}
