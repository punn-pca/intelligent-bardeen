import { NextRequest, NextResponse } from 'next/server';
import { processStockTransfer } from '@/lib/stock-manager';
import { checkAuth, hasPermission } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const userRole = req.headers.get('x-user-role');
    const user = checkAuth(userRole);

    if (!hasPermission(user.role, 'stock:transfer')) {
      return NextResponse.json({ error: 'You do not have permission' }, { status: 403 });
    }

    const body = await req.json();
    const { productId, sourceWarehouseId, destinationWarehouseId, quantity, reference, note } = body;

    if (!productId || !sourceWarehouseId || !destinationWarehouseId || !quantity) {
      return NextResponse.json({ error: 'Product, Source Warehouse, Destination Warehouse, and Quantity are required' }, { status: 400 });
    }

    const result = await processStockTransfer({
      productId,
      sourceWarehouseId,
      destinationWarehouseId,
      quantity: parseInt(quantity),
      reference,
      note,
      createdById: user.id,
      username: user.username,
    });

    return NextResponse.json({
      success: true,
      message: 'Stock Transfer transaction completed successfully',
      ...result,
    }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Stock Transfer failed' }, { status: 400 });
  }
}
