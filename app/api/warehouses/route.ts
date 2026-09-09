import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { checkAuth, hasPermission } from '@/lib/auth';
import { createAuditLog } from '@/lib/audit-logger';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const includeInactive = searchParams.get('includeInactive') === 'true';

    const where: any = {};
    if (!includeInactive) {
      where.active = true;
    }

    const warehouses = await prisma.warehouse.findMany({
      where,
      include: {
        _count: {
          select: { inventories: true },
        },
      },
      orderBy: { code: 'asc' },
    });

    return NextResponse.json(warehouses);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch warehouses' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const userRole = req.headers.get('x-user-role');
    const user = checkAuth(userRole);

    if (!hasPermission(user.role, 'warehouses:create')) {
      return NextResponse.json({ error: 'You do not have permission' }, { status: 403 });
    }

    const body = await req.json();
    const { code, name, address, managerName } = body;

    if (!code || !name) {
      return NextResponse.json({ error: 'Warehouse code and name are required' }, { status: 400 });
    }

    const existingCode = await prisma.warehouse.findUnique({ where: { code } });
    if (existingCode) {
      return NextResponse.json({ error: 'Warehouse code already exists' }, { status: 400 });
    }

    const warehouse = await prisma.warehouse.create({
      data: { code, name, address, managerName, active: true },
    });

    await createAuditLog({
      userId: user.id,
      username: user.username,
      action: 'CREATE_WAREHOUSE',
      entity: 'Warehouse',
      entityId: warehouse.id,
      afterData: { code, name, managerName },
    });

    return NextResponse.json(warehouse, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to create warehouse' }, { status: 500 });
  }
}
