import { NextRequest, NextResponse } from 'next/server';
import { processStockAdjustment } from '@/lib/stock-manager';
import { checkAuth, hasPermission } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const userRole = req.headers.get('x-user-role');
    const user = checkAuth(userRole);

    if (!hasPermission(user.role, 'stock:adjustment')) {
      return NextResponse.json({ error: 'You do not have permission' }, { status: 403 });
    }

    const body = await req.json();
    const { productId, warehouseId, actualStock, reason, note } = body;

    if (!productId || !warehouseId || actualStock === undefined || !reason) {
      return NextResponse.json({ error: 'Product, Warehouse, Actual Stock, and Reason are required' }, { status: 400 });
    }

    const result = await processStockAdjustment({
      productId,
      warehouseId,
      actualStock: parseInt(actualStock),
      reason,
      note,
      createdById: user.id,
      username: user.username,
    });

    return NextResponse.json({
      success: true,
      message: 'Stock Adjustment transaction completed successfully',
      ...result,
    }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Stock Adjustment failed' }, { status: 400 });
  }
}
