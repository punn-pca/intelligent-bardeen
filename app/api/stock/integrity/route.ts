import { NextRequest, NextResponse } from 'next/server';
import { verifyStockIntegrity } from '@/lib/stock-manager';
import { checkAuth, hasPermission } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const userRole = req.headers.get('x-user-role');
    const user = checkAuth(userRole);

    if (!hasPermission(user.role, 'stock:integrity')) {
      return NextResponse.json({ error: 'You do not have permission' }, { status: 403 });
    }

    const auditResult = await verifyStockIntegrity();

    return NextResponse.json(auditResult);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Integrity check failed' }, { status: 500 });
  }
}
