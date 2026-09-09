import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { checkAuth, hasPermission } from '@/lib/auth';
import { createAuditLog } from '@/lib/audit-logger';

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userRole = req.headers.get('x-user-role');
    const user = checkAuth(userRole);

    if (!hasPermission(user.role, 'warehouses:create')) {
      return NextResponse.json({ error: 'You do not have permission to edit warehouses' }, { status: 403 });
    }

    const { id } = params;
    const body = await req.json();
    const { code, name, address, managerName, active } = body;

    const existing = await prisma.warehouse.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Warehouse not found' }, { status: 404 });
    }

    if (code && code !== existing.code) {
      const codeDuplicate = await prisma.warehouse.findUnique({ where: { code } });
      if (codeDuplicate) {
        return NextResponse.json({ error: 'Warehouse code already exists' }, { status: 400 });
      }
    }

    const updated = await prisma.warehouse.update({
      where: { id },
      data: {
        code: code || existing.code,
        name: name || existing.name,
        address: address !== undefined ? address : existing.address,
        managerName: managerName !== undefined ? managerName : existing.managerName,
        active: active !== undefined ? active : existing.active,
      },
    });

    await createAuditLog({
      userId: user.id,
      username: user.username,
      action: 'UPDATE_WAREHOUSE',
      entity: 'Warehouse',
      entityId: id,
      beforeData: existing,
      afterData: updated,
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to update warehouse' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userRole = req.headers.get('x-user-role');
    const user = checkAuth(userRole);

    if (!hasPermission(user.role, 'warehouses:create')) {
      return NextResponse.json({ error: 'You do not have permission' }, { status: 403 });
    }

    const { id } = params;
    const existing = await prisma.warehouse.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            documents: true,
            targetDocuments: true,
            movements: true,
          },
        },
      },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Warehouse not found' }, { status: 404 });
    }

    const hasRelations = (existing._count.documents + existing._count.targetDocuments + existing._count.movements) > 0;

    let result;
    if (hasRelations) {
      // Soft Delete / Deactivate to protect historical ledger integrity
      result = await prisma.warehouse.update({
        where: { id },
        data: { active: false },
      });

      await createAuditLog({
        userId: user.id,
        username: user.username,
        action: 'DEACTIVATE_WAREHOUSE',
        entity: 'Warehouse',
        entityId: id,
        beforeData: existing,
        afterData: result,
      });
    } else {
      // Hard Delete if no historical documents or movements exist
      await prisma.inventory.deleteMany({ where: { warehouseId: id } });
      await prisma.warehouseLocation.deleteMany({ where: { warehouseId: id } });
      result = await prisma.warehouse.delete({ where: { id } });

      await createAuditLog({
        userId: user.id,
        username: user.username,
        action: 'DELETE_WAREHOUSE',
        entity: 'Warehouse',
        entityId: id,
        beforeData: existing,
      });
    }

    return NextResponse.json({ success: true, message: 'Warehouse deleted successfully', warehouse: result });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to delete warehouse' }, { status: 500 });
  }
}
