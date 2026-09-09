import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { checkAuth, hasPermission } from '@/lib/auth';
import { recordAuditLog } from '@/lib/audit-logger';

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const roleHeader = req.headers.get('x-user-role');
    const user = checkAuth(roleHeader);

    if (!hasPermission(user.role, 'categories:update')) {
      return NextResponse.json({ error: 'Permission denied. Only ADMIN or MANAGER can update categories.' }, { status: 403 });
    }

    const body = await req.json();
    const { name, description } = body;

    const existing = await prisma.category.findUnique({ where: { id: params.id } });
    if (!existing) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

    if (name && name !== existing.name) {
      const duplicate = await prisma.category.findUnique({ where: { name } });
      if (duplicate) {
        return NextResponse.json({ error: 'Category name already exists' }, { status: 400 });
      }
    }

    const updated = await prisma.category.update({
      where: { id: params.id },
      data: {
        name: name !== undefined ? name : existing.name,
        description: description !== undefined ? description : existing.description,
      },
    });

    await recordAuditLog({
      userId: user.id,
      username: user.username,
      action: 'UPDATE_CATEGORY',
      entity: 'Category',
      entityId: updated.id,
      beforeData: JSON.stringify(existing),
      afterData: JSON.stringify(updated),
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to update category' }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const roleHeader = req.headers.get('x-user-role');
    const user = checkAuth(roleHeader);

    if (!hasPermission(user.role, 'categories:create')) {
      return NextResponse.json({ error: 'Permission denied. Only ADMIN can delete categories.' }, { status: 403 });
    }

    const existing = await prisma.category.findUnique({
      where: { id: params.id },
      include: {
        _count: { select: { products: { where: { isDeleted: false } } } },
      },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

    if (existing._count.products > 0) {
      // Find fallback category
      const fallbackCat = await prisma.category.findFirst({
        where: { id: { not: params.id } },
      });

      if (fallbackCat) {
        // Reassign products to fallback category
        await prisma.product.updateMany({
          where: { categoryId: params.id },
          data: { categoryId: fallbackCat.id },
        });
      }
    }

    await prisma.category.delete({ where: { id: params.id } });

    await recordAuditLog({
      userId: user.id,
      username: user.username,
      action: 'DELETE_CATEGORY',
      entity: 'Category',
      entityId: params.id,
      beforeData: JSON.stringify(existing),
    });

    return NextResponse.json({ success: true, message: 'Category deleted successfully' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to delete category' }, { status: 400 });
  }
}
