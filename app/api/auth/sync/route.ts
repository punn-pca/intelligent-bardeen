import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const { uid, email, name } = await req.json();

    if (!uid) {
      return NextResponse.json({ error: 'Missing UID' }, { status: 400 });
    }

    // Find user by firebaseUid, email, or username
    let user = await prisma.user.findFirst({
      where: {
        OR: [
          { firebaseUid: uid },
          ...(email ? [{ email }] : []),
          ...(email ? [{ username: email }] : []),
        ],
      },
    });

    if (user) {
      // Update firebaseUid if not set
      if (!user.firebaseUid || !user.email) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: {
            firebaseUid: uid,
            email: email || user.email,
          },
        });
      }
    } else {
      // Check total user count: First user gets ADMIN, subsequent users get STAFF/USER
      const count = await prisma.user.count();
      const initialRole = count === 0 ? 'ADMIN' : 'USER';

      user = await prisma.user.create({
        data: {
          firebaseUid: uid,
          email: email || `${uid.slice(0, 8)}@sberp.local`,
          username: email || `user_${uid.slice(0, 8)}`,
          name: name || 'ERP User',
          passwordHash: '$2a$10$FirebaseManagedPasswordHashPlaceholder',
          role: initialRole,
          active: true,
        },
      });
    }

    return NextResponse.json({
      id: user.id,
      firebaseUid: user.firebaseUid,
      email: user.email,
      username: user.username,
      name: user.name,
      role: user.role,
      active: user.active,
    });
  } catch (e: any) {
    console.error('Error syncing auth user:', e);
    return NextResponse.json({ error: e.message || 'Internal error' }, { status: 500 });
  }
}
