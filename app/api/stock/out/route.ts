import { NextRequest, NextResponse } from 'next/server';
import { processStockOut } from '@/lib/stock-manager';
import { checkAuth, hasPermission } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const userRole = req.headers.get('x-user-role');
    const user = checkAuth(userRole);

    if (!hasPermission(user.role, 'stock:out')) {
      return NextResponse.json({ error: 'You do not have permission' }, { status: 403 });
    }

    const body = await req.json();
    const { productId, warehouseId, quantity, reference, reason, requestedBy } = body;

    if (!productId || !warehouseId || !quantity) {
      return NextResponse.json({ error: 'Product, Warehouse, and Quantity are required' }, { status: 400 });
    }

    const result = await processStockOut({
      productId,
      warehouseId,
      quantity: parseInt(quantity),
      reference,
      reason,
      requestedBy,
      createdById: user.id,
      username: user.username,
    });

    return NextResponse.json({
      success: true,
      message: 'Stock Out transaction completed successfully',
      ...result,
    }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Stock Out failed' }, { status: 400 });
  }
}
