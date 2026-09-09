import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    const warehouseId = searchParams.get('warehouseId') || '';
    const categoryId = searchParams.get('categoryId') || '';
    const status = searchParams.get('status') || ''; // IN_STOCK, LOW_STOCK, OUT_OF_STOCK, OVER_STOCK

    const where: any = {};

    if (warehouseId) {
      where.warehouseId = warehouseId;
    }

    if (categoryId || search) {
      where.product = {
        isDeleted: false,
        ...(categoryId ? { categoryId } : {}),
        ...(search
          ? {
              OR: [
                { name: { contains: search } },
                { sku: { contains: search } },
                { barcode: { contains: search } },
              ],
            }
          : {}),
      };
    } else {
      where.product = { isDeleted: false };
    }

    const [inventories, movements] = await Promise.all([
      prisma.inventory.findMany({
        where,
        include: {
          product: {
            include: { category: true },
          },
          warehouse: true,
        },
        orderBy: [{ product: { sku: 'asc' } }, { warehouse: { code: 'asc' } }],
      }),
      prisma.stockMovement.findMany({
        select: {
          productId: true,
          type: true,
          quantity: true,
          reference: true,
          transactionId: true,
        },
      }),
    ]);

    // Aggregate movements per product matching Excel Sheet 'STOCK' columns
    const movStats: Record<string, { stockIn: number; stockOut: number; dealerOut: number; shopeeOut: number }> = {};

    movements.forEach((m) => {
      if (!movStats[m.productId]) {
        movStats[m.productId] = { stockIn: 0, stockOut: 0, dealerOut: 0, shopeeOut: 0 };
      }
      const ref = (m.reference || m.transactionId || '').toUpperCase();
      const qty = Math.abs(m.quantity);

      if (m.type === 'RECEIVE' || m.type === 'IN') {
        movStats[m.productId].stockIn += qty;
      } else if (m.type === 'ISSUE' || m.type === 'OUT') {
        if (ref.startsWith('B2608') || ref.startsWith('R2608')) {
          movStats[m.productId].dealerOut += qty;
        } else if (ref.includes('SHOPEE') || ref.startsWith('A2608')) {
          movStats[m.productId].shopeeOut += qty;
        } else {
          movStats[m.productId].stockOut += qty;
        }
      }
    });

    const items = inventories.map((inv) => {
      const available = inv.onHand - inv.reserved;
      let stockStatus = 'IN_STOCK';

      if (inv.onHand === 0) {
        stockStatus = 'OUT_OF_STOCK';
      } else if (inv.onHand <= inv.product.minStock) {
        stockStatus = 'LOW_STOCK';
      } else if (inv.onHand > inv.product.maxStock) {
        stockStatus = 'OVER_STOCK';
      }

      const pMov = movStats[inv.productId] || { stockIn: 0, stockOut: 0, dealerOut: 0, shopeeOut: 0 };

      return {
        id: inv.id,
        productId: inv.productId,
        productName: inv.product.name,
        sku: inv.product.sku,
        barcode: inv.product.barcode,
        unit: inv.product.unit,
        categoryName: inv.product.category.name,
        costPrice: inv.product.costPrice,
        sellingPrice: inv.product.sellingPrice,
        minStock: inv.product.minStock,
        maxStock: inv.product.maxStock,
        warehouseId: inv.warehouseId,
        warehouseCode: inv.warehouse.code,
        warehouseName: inv.warehouse.name,

        // Exact Excel Sheet 'STOCK' Ledger Breakdown
        openingBalance: Math.max(0, inv.onHand - pMov.stockIn + pMov.stockOut + pMov.dealerOut + pMov.shopeeOut),
        stockIn: pMov.stockIn,
        stockOut: pMov.stockOut,
        dealerOut: pMov.dealerOut,
        shopeeOut: pMov.shopeeOut,

        onHand: inv.onHand,
        reserved: inv.reserved,
        available,
        status: stockStatus,
        stockValue: inv.onHand * inv.product.costPrice,
        updatedAt: inv.updatedAt,
      };
    });

    // Filter by stockStatus if specified
    const filteredItems = status
      ? items.filter((item) => item.status === status.toUpperCase())
      : items;

    // Summary statistics
    const summary = {
      totalItems: filteredItems.length,
      totalOnHand: filteredItems.reduce((acc, item) => acc + item.onHand, 0),
      totalValuation: filteredItems.reduce((acc, item) => acc + item.stockValue, 0),
      inStockCount: filteredItems.filter((i) => i.status === 'IN_STOCK').length,
      lowStockCount: filteredItems.filter((i) => i.status === 'LOW_STOCK').length,
      outOfStockCount: filteredItems.filter((i) => i.status === 'OUT_OF_STOCK').length,
      overStockCount: filteredItems.filter((i) => i.status === 'OVER_STOCK').length,
    };

    return NextResponse.json({
      data: filteredItems,
      summary,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch inventory' }, { status: 500 });
  }
}
