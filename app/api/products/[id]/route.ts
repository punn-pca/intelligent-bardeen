import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { checkAuth, hasPermission } from '@/lib/auth';
import { recordAuditLog } from '@/lib/audit-logger';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const product = await prisma.product.findUnique({
      where: { id: params.id },
      include: {
        category: true,
        unitRef: true,
        supplier: true,
        inventories: {
          include: {
            warehouse: true,
          },
        },
      },
    });

    if (!product || product.isDeleted) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    const totalOnHand = product.inventories.reduce((acc, i) => acc + i.onHand, 0);
    const totalReserved = product.inventories.reduce((acc, i) => acc + i.reserved, 0);

    return NextResponse.json({
      ...product,
      totalOnHand,
      totalReserved,
      totalAvailable: totalOnHand - totalReserved,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch product' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const roleHeader = req.headers.get('x-user-role');
    const user = checkAuth(roleHeader);

    // STRICT CHECK: Only ADMIN has products:update permission
    if (!hasPermission(user.role, 'products:update')) {
      return NextResponse.json({ error: 'Permission denied. Only ADMIN role can edit products.' }, { status: 403 });
    }

    const body = await req.json();
    const existing = await prisma.product.findUnique({ where: { id: params.id } });

    if (!existing || existing.isDeleted) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    // Check SKU uniqueness if changed
    if (body.sku && body.sku !== existing.sku) {
      const duplicateSku = await prisma.product.findUnique({ where: { sku: body.sku } });
      if (duplicateSku) {
        return NextResponse.json({ error: 'SKU already exists' }, { status: 400 });
      }
    }

    // Check Barcode uniqueness if changed
    if (body.barcode && body.barcode !== existing.barcode) {
      const duplicateBarcode = await prisma.product.findUnique({ where: { barcode: body.barcode } });
      if (duplicateBarcode) {
        return NextResponse.json({ error: 'Barcode already exists' }, { status: 400 });
      }
    }

    const updated = await prisma.product.update({
      where: { id: params.id },
      data: {
        sku: body.sku !== undefined ? body.sku : existing.sku,
        barcode: body.barcode !== undefined ? body.barcode : existing.barcode,
        name: body.name !== undefined ? body.name : existing.name,
        description: body.description !== undefined ? body.description : existing.description,
        categoryId: body.categoryId !== undefined ? body.categoryId : existing.categoryId,
        unit: body.unit !== undefined ? body.unit : existing.unit,
        costPrice: body.costPrice !== undefined ? parseFloat(body.costPrice) : existing.costPrice,
        sellingPrice: body.sellingPrice !== undefined ? parseFloat(body.sellingPrice) : existing.sellingPrice,
        minStock: body.minStock !== undefined ? parseInt(body.minStock) : existing.minStock,
        maxStock: body.maxStock !== undefined ? parseInt(body.maxStock) : existing.maxStock,
        active: body.active !== undefined ? Boolean(body.active) : existing.active,
      },
      include: {
        category: true,
      },
    });

    await recordAuditLog({
      userId: user.id,
      username: user.username,
      action: 'UPDATE_PRODUCT',
      entity: 'Product',
      entityId: updated.id,
      beforeData: JSON.stringify(existing),
      afterData: JSON.stringify(updated),
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to update product' }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const roleHeader = req.headers.get('x-user-role');
    const user = checkAuth(roleHeader);

    // STRICT CHECK: Only ADMIN has products:delete permission
    if (!hasPermission(user.role, 'products:delete')) {
      return NextResponse.json({ error: 'Permission denied. Only ADMIN role can delete products.' }, { status: 403 });
    }

    const existing = await prisma.product.findUnique({ where: { id: params.id } });
    if (!existing || existing.isDeleted) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    // Soft delete
    const deleted = await prisma.product.update({
      where: { id: params.id },
      data: { isDeleted: true, active: false },
    });

    await recordAuditLog({
      userId: user.id,
      username: user.username,
      action: 'DELETE_PRODUCT',
      entity: 'Product',
      entityId: deleted.id,
      beforeData: JSON.stringify(existing),
    });

    return NextResponse.json({ success: true, message: 'Product soft deleted successfully' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to delete product' }, { status: 400 });
  }
}
