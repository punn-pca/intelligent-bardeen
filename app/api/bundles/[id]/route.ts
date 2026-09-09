import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { checkAuth, hasPermission } from '@/lib/auth';
import { createAuditLog } from '@/lib/audit-logger';

// DELETE /api/bundles/[id] -> Remove bundle recipe
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const roleHeader = req.headers.get('x-user-role');
    const session = checkAuth(roleHeader);

    if (!hasPermission(session.role, 'stock:bundle')) {
      return NextResponse.json({ error: 'Permission denied for bundle deletion' }, { status: 403 });
    }

    const { id } = params;

    const bundleProduct = await prisma.product.findUnique({
      where: { id },
      include: { bundleItems: true },
    });

    if (!bundleProduct) {
      return NextResponse.json({ error: 'Bundle product not found' }, { status: 404 });
    }

    await prisma.$transaction([
      prisma.bundleItem.deleteMany({
        where: { bundleProductId: id },
      }),
      prisma.product.update({
        where: { id },
        data: { isBundle: false },
      }),
    ]);

    await createAuditLog({
      userId: session.id,
      username: session.username,
      action: 'DELETE_BUNDLE_RECIPE',
      entity: 'BundleRecipe',
      entityId: id,
      beforeData: bundleProduct,
    });

    return NextResponse.json({ success: true, message: 'ลบสูตรชุดสินค้าเรียบร้อยแล้ว' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to delete bundle recipe' }, { status: 500 });
  }
}

// PUT /api/bundles/[id] -> Update bundle recipe components
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const roleHeader = req.headers.get('x-user-role');
    const session = checkAuth(roleHeader);

    if (!hasPermission(session.role, 'stock:bundle')) {
      return NextResponse.json({ error: 'Permission denied for bundle configuration' }, { status: 403 });
    }

    const { id } = params;
    const body = await req.json();
    const { components } = body; // Array<{ componentProductId: string, quantity: number }>

    if (!Array.isArray(components) || components.length === 0) {
      return NextResponse.json({ error: 'Component list is required' }, { status: 400 });
    }

    const parentProduct = await prisma.product.findUnique({ where: { id } });
    if (!parentProduct) {
      return NextResponse.json({ error: 'Parent bundle product not found' }, { status: 404 });
    }

    const result = await prisma.$transaction(async (tx) => {
      await tx.product.update({
        where: { id },
        data: { isBundle: true },
      });

      await tx.bundleItem.deleteMany({
        where: { bundleProductId: id },
      });

      const newItems = await tx.bundleItem.createMany({
        data: components.map((c: any) => ({
          bundleProductId: id,
          componentProductId: c.componentProductId,
          quantity: Math.max(1, parseInt(c.quantity) || 1),
        })),
      });

      return newItems;
    });

    await createAuditLog({
      userId: session.id,
      username: session.username,
      action: 'UPDATE_BUNDLE_RECIPE',
      entity: 'BundleRecipe',
      entityId: id,
      afterData: { bundleProductId: id, components },
    });

    return NextResponse.json({ success: true, message: 'แก้ไขสูตรจัดชุดสินค้าเรียบร้อยแล้ว', result });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to update bundle recipe' }, { status: 500 });
  }
}
