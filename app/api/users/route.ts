import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { checkAuth, hasPermission } from '@/lib/auth';
import { createAuditLog } from '@/lib/audit-logger';
import bcrypt from 'bcryptjs';

export async function GET(req: NextRequest) {
  try {
    const userRole = req.headers.get('x-user-role');
    const user = checkAuth(userRole);

    if (!hasPermission(user.role, 'users:manage')) {
      return NextResponse.json({ error: 'You do not have permission' }, { status: 403 });
    }

    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        name: true,
        role: true,
        active: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(users);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch users' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const userRole = req.headers.get('x-user-role');
    const user = checkAuth(userRole);

    if (!hasPermission(user.role, 'users:manage')) {
      return NextResponse.json({ error: 'You do not have permission' }, { status: 403 });
    }

    const body = await req.json();
    const { username, password, name, role } = body;

    if (!username || !password || !name || !role) {
      return NextResponse.json({ error: 'Username, password, name, and role are required' }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { username } });
    if (existing) {
      return NextResponse.json({ error: 'Username already exists' }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const newUser = await prisma.user.create({
      data: {
        username,
        name,
        role,
        passwordHash,
      },
      select: {
        id: true,
        username: true,
        name: true,
        role: true,
        active: true,
        createdAt: true,
      },
    });

    await createAuditLog({
      userId: user.id,
      username: user.username,
      action: 'CREATE_USER',
      entity: 'User',
      entityId: newUser.id,
      afterData: { username, name, role },
    });

    return NextResponse.json(newUser, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to create user' }, { status: 500 });
  }
}
