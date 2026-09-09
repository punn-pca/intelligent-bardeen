import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { checkAuth, hasPermission } from '@/lib/auth';

export async function GET() {
  try {
    const bundles = await prisma.product.findMany({
      where: { isBundle: true, isDeleted: false },
      include: {
        bundleItems: {
          include: {
            componentProduct: {
              select: { id: true, sku: true, name: true, unit: true, costPrice: true },
            },
          },
        },
        inventories: {
          include: { warehouse: { select: { id: true, code: true, name: true } } },
        },
      },
      orderBy: { sku: 'asc' },
    });

    return NextResponse.json(bundles);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch product bundles' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const roleHeader = req.headers.get('x-user-role');
    const session = checkAuth(roleHeader);

    if (!hasPermission(session.role, 'stock:bundle')) {
      return NextResponse.json({ error: 'Permission denied for bundle configuration' }, { status: 403 });
    }

    const body = await req.json();
    const { bundleProductId, components } = body; // components: Array<{ componentProductId, quantity }>

    if (!bundleProductId || !Array.isArray(components) || components.length === 0) {
      return NextResponse.json({ error: 'Bundle product ID and component list are required' }, { status: 400 });
    }

    const parentProduct = await prisma.product.findUnique({ where: { id: bundleProductId } });
    if (!parentProduct) {
      return NextResponse.json({ error: 'Parent bundle product not found' }, { status: 404 });
    }

    const result = await prisma.$transaction(async (tx) => {
      // Mark parent as bundle
      await tx.product.update({
        where: { id: bundleProductId },
        data: { isBundle: true },
      });

      // Clear existing bundle items for this parent
      await tx.bundleItem.deleteMany({
        where: { bundleProductId },
      });

      // Insert new bundle component items
      const newItems = await tx.bundleItem.createMany({
        data: components.map((c: any) => ({
          bundleProductId,
          componentProductId: c.componentProductId,
          quantity: Math.max(1, parseInt(c.quantity) || 1),
        })),
      });

      return newItems;
    });

    return NextResponse.json({ success: true, message: 'Bundle recipe saved successfully', result });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to save bundle recipe' }, { status: 400 });
  }
}
