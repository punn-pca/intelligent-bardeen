import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { checkAuth, hasPermission } from '@/lib/auth';
import { createAuditLog } from '@/lib/audit-logger';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    const categoryId = searchParams.get('categoryId') || '';
    const warehouseId = searchParams.get('warehouseId') || '';
    const status = searchParams.get('status') || ''; // active, inactive, low_stock, out_of_stock
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '2000');

    const skip = (page - 1) * limit;

    const where: any = {
      isDeleted: false,
    };

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { sku: { contains: search } },
        { barcode: { contains: search } },
      ];
    }

    if (categoryId) {
      where.categoryId = categoryId;
    }

    if (status === 'active') {
      where.active = true;
    } else if (status === 'inactive') {
      where.active = false;
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          category: true,
          inventories: {
            include: {
              warehouse: true,
            },
          },
        },
        orderBy: { sku: 'asc' },
        skip,
        take: limit,
      }),
      prisma.product.count({ where }),
    ]);

    // Enhance with aggregated stock & stock status
    const enhancedProducts = products.map((p) => {
      let totalOnHand = 0;
      let totalReserved = 0;

      if (warehouseId) {
        const inv = p.inventories.find((i) => i.warehouseId === warehouseId);
        totalOnHand = inv?.onHand || 0;
        totalReserved = inv?.reserved || 0;
      } else {
        totalOnHand = p.inventories.reduce((acc, i) => acc + i.onHand, 0);
        totalReserved = p.inventories.reduce((acc, i) => acc + i.reserved, 0);
      }

      const totalAvailable = totalOnHand - totalReserved;

      let stockStatus = 'IN_STOCK';
      if (totalOnHand === 0) {
        stockStatus = 'OUT_OF_STOCK';
      } else if (totalOnHand <= p.minStock) {
        stockStatus = 'LOW_STOCK';
      } else if (totalOnHand > p.maxStock) {
        stockStatus = 'OVER_STOCK';
      }

      return {
        ...p,
        totalOnHand,
        totalReserved,
        totalAvailable,
        stockStatus,
      };
    });

    // Filter by stockStatus if requested
    let finalProducts = enhancedProducts;
    if (status === 'low_stock') {
      finalProducts = enhancedProducts.filter((p) => p.stockStatus === 'LOW_STOCK');
    } else if (status === 'out_of_stock') {
      finalProducts = enhancedProducts.filter((p) => p.stockStatus === 'OUT_OF_STOCK');
    }

    return NextResponse.json({
      data: finalProducts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch products' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const userRole = req.headers.get('x-user-role');
    const user = checkAuth(userRole);

    if (!hasPermission(user.role, 'products:create')) {
      return NextResponse.json({ error: 'You do not have permission' }, { status: 403 });
    }

    const body = await req.json();
    const { sku, barcode, name, description, imageUrl, categoryId, unit, costPrice, sellingPrice, minStock, maxStock } = body;

    if (!sku || !barcode || !name || !categoryId) {
      return NextResponse.json({ error: 'SKU, Barcode, Name, and Category are required' }, { status: 400 });
    }

    // Check unique SKU
    const existingSku = await prisma.product.findUnique({ where: { sku } });
    if (existingSku) {
      return NextResponse.json({ error: 'SKU already exists' }, { status: 400 });
    }

    // Check unique Barcode
    const existingBarcode = await prisma.product.findUnique({ where: { barcode } });
    if (existingBarcode) {
      return NextResponse.json({ error: 'Barcode already exists' }, { status: 400 });
    }

    const product = await prisma.product.create({
      data: {
        sku,
        barcode,
        name,
        description,
        imageUrl,
        categoryId,
        unit: unit || 'ชิ้น',
        costPrice: parseFloat(costPrice || 0),
        sellingPrice: parseFloat(sellingPrice || 0),
        minStock: parseInt(minStock || 5),
        maxStock: parseInt(maxStock || 100),
      },
      include: {
        category: true,
      },
    });

    await createAuditLog({
      userId: user.id,
      username: user.username,
      action: 'CREATE_PRODUCT',
      entity: 'Product',
      entityId: product.id,
      afterData: { sku, barcode, name, categoryId },
    });

    return NextResponse.json(product, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to create product' }, { status: 500 });
  }
}
