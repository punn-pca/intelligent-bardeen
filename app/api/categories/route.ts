import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { checkAuth, hasPermission } from '@/lib/auth';
import { createAuditLog } from '@/lib/audit-logger';

export async function GET() {
  try {
    const categories = await prisma.category.findMany({
      include: {
        _count: {
          select: { products: { where: { isDeleted: false } } },
        },
      },
      orderBy: { name: 'asc' },
    });

    const formatted = categories.map((c) => ({
      ...c,
      productCount: c._count.products,
    }));

    return NextResponse.json(formatted);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch categories' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const userRole = req.headers.get('x-user-role');
    const user = checkAuth(userRole);

    if (!hasPermission(user.role, 'categories:create')) {
      return NextResponse.json({ error: 'You do not have permission' }, { status: 403 });
    }

    const body = await req.json();
    const { name, description } = body;

    if (!name) {
      return NextResponse.json({ error: 'Category name is required' }, { status: 400 });
    }

    const existing = await prisma.category.findUnique({ where: { name } });
    if (existing) {
      return NextResponse.json({ error: 'Category name already exists' }, { status: 400 });
    }

    const category = await prisma.category.create({
      data: { name, description },
    });

    await createAuditLog({
      userId: user.id,
      username: user.username,
      action: 'CREATE_CATEGORY',
      entity: 'Category',
      entityId: category.id,
      afterData: { name, description },
    });

    return NextResponse.json(category, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to create category' }, { status: 500 });
  }
}
