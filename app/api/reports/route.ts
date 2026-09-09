import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type') || 'valuation'; // valuation, movement, low_stock, warehouse
    const exportFormat = searchParams.get('export'); // csv

    const warehouseId = searchParams.get('warehouseId');
    const categoryId = searchParams.get('categoryId');

    const productWhere: any = { isDeleted: false };
    if (categoryId) productWhere.categoryId = categoryId;

    const inventories = await prisma.inventory.findMany({
      where: {
        ...(warehouseId ? { warehouseId } : {}),
        product: productWhere,
      },
      include: {
        product: { include: { category: true } },
        warehouse: true,
      },
    });

    const reportData = inventories.map((inv) => {
      const available = inv.onHand - inv.reserved;
      let status = 'IN_STOCK';
      if (inv.onHand === 0) status = 'OUT_OF_STOCK';
      else if (inv.onHand <= inv.product.minStock) status = 'LOW_STOCK';
      else if (inv.onHand > inv.product.maxStock) status = 'OVER_STOCK';

      return {
        sku: inv.product.sku,
        barcode: inv.product.barcode,
        productName: inv.product.name,
        category: inv.product.category.name,
        warehouseCode: inv.warehouse.code,
        warehouseName: inv.warehouse.name,
        onHand: inv.onHand,
        reserved: inv.reserved,
        available,
        unit: inv.product.unit,
        costPrice: inv.product.costPrice,
        sellingPrice: inv.product.sellingPrice,
        totalValuation: inv.onHand * inv.product.costPrice,
        status,
        minStock: inv.product.minStock,
      };
    });

    if (exportFormat === 'csv') {
      const headers = ['SKU', 'Barcode', 'Product Name', 'Category', 'Warehouse', 'On Hand', 'Available', 'Unit', 'Cost Price', 'Total Value', 'Status'];
      const csvRows = [headers.join(',')];

      for (const row of reportData) {
        const line = [
          `"${row.sku}"`,
          `"${row.barcode}"`,
          `"${row.productName.replace(/"/g, '""')}"`,
          `"${row.category}"`,
          `"${row.warehouseCode}"`,
          row.onHand,
          row.available,
          `"${row.unit}"`,
          row.costPrice,
          row.totalValuation,
          `"${row.status}"`,
        ];
        csvRows.push(line.join(','));
      }

      const csvContent = csvRows.join('\n');
      return new NextResponse(csvContent, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="inventory-report-${type}-${Date.now()}.csv"`,
        },
      });
    }

    return NextResponse.json({
      type,
      totalItems: reportData.length,
      totalOnHand: reportData.reduce((a, b) => a + b.onHand, 0),
      totalValuation: reportData.reduce((a, b) => a + b.totalValuation, 0),
      rows: reportData,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to generate report' }, { status: 500 });
  }
}
