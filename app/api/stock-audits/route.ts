import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { checkAuth, hasPermission } from '@/lib/auth';
import { generateDocumentNumber } from '@/lib/document-engine';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const warehouseId = searchParams.get('warehouseId') || '';
    const status = searchParams.get('status') || '';

    const where: any = {};
    if (warehouseId) where.warehouseId = warehouseId;
    if (status) where.status = status;

    const audits = await prisma.stockAudit.findMany({
      where,
      include: {
        warehouse: { select: { id: true, code: true, name: true } },
        createdBy: { select: { id: true, name: true, username: true } },
        _count: { select: { items: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(audits);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch stock audits' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const roleHeader = req.headers.get('x-user-role');
    const session = checkAuth(roleHeader);

    if (!hasPermission(session.role, 'stock:audit')) {
      return NextResponse.json({ error: 'Permission denied for stock audit' }, { status: 403 });
    }

    const body = await req.json();
    const { warehouseId, notes } = body;

    if (!warehouseId) {
      return NextResponse.json({ error: 'Warehouse is required' }, { status: 400 });
    }

    const warehouse = await prisma.warehouse.findUnique({ where: { id: warehouseId } });
    if (!warehouse) {
      return NextResponse.json({ error: 'Warehouse not found' }, { status: 404 });
    }

    const auditNo = await generateDocumentNumber('STOCK_ADJUSTMENT' as any);
    const customAuditNo = auditNo.replace(/^ADJ-/, 'AUD-');

    // Fetch all active products and their current inventory onHand for this warehouse
    const products = await prisma.product.findMany({
      where: { active: true, isDeleted: false },
      include: {
        inventories: {
          where: { warehouseId },
        },
      },
    });

    const audit = await prisma.$transaction(async (tx) => {
      const createdAudit = await tx.stockAudit.create({
        data: {
          auditNo: customAuditNo,
          warehouseId,
          notes: notes || `รอบการนับสต็อกคลัง ${warehouse.code}`,
          createdById: session.id,
          status: 'IN_PROGRESS',
        },
      });

      const auditItemsData = products.map((p) => {
        const inv = p.inventories[0];
        const sysQty = inv ? inv.onHand : 0;
        return {
          auditId: createdAudit.id,
          productId: p.id,
          systemQty: sysQty,
          countedQty: 0,
          varianceQty: -sysQty,
          unitCost: p.costPrice,
          varianceValue: -sysQty * p.costPrice,
        };
      });

      await tx.stockAuditItem.createMany({
        data: auditItemsData,
      });

      return createdAudit;
    }, { timeout: 20000 });

    return NextResponse.json(audit, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to create stock audit' }, { status: 400 });
  }
}
