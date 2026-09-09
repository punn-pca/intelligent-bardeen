import { NextRequest, NextResponse } from 'next/server';
import { processStockIn } from '@/lib/stock-manager';
import { checkAuth, hasPermission } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const userRole = req.headers.get('x-user-role');
    const user = checkAuth(userRole);

    if (!hasPermission(user.role, 'stock:in')) {
      return NextResponse.json({ error: 'You do not have permission' }, { status: 403 });
    }

    const body = await req.json();
    const { productId, warehouseId, quantity, costPrice, lotNumber, reference, reason } = body;

    if (!productId || !warehouseId || !quantity) {
      return NextResponse.json({ error: 'Product, Warehouse, and Quantity are required' }, { status: 400 });
    }

    const result = await processStockIn({
      productId,
      warehouseId,
      quantity: parseInt(quantity),
      costPrice: costPrice ? parseFloat(costPrice) : undefined,
      lotNumber,
      reference,
      reason,
      createdById: user.id,
      username: user.username,
    });

    return NextResponse.json({
      success: true,
      message: 'Stock In transaction completed successfully',
      ...result,
    }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Stock In failed' }, { status: 400 });
  }
}
