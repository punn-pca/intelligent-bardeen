import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { checkAuth, hasPermission } from '@/lib/auth';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const audit = await prisma.stockAudit.findUnique({
      where: { id: params.id },
      include: {
        warehouse: true,
        createdBy: { select: { id: true, name: true, username: true } },
        items: {
          include: {
            product: { select: { id: true, sku: true, barcode: true, name: true, unit: true, costPrice: true } },
            location: { select: { id: true, code: true, name: true } },
          },
          orderBy: { product: { sku: 'asc' } },
        },
      },
    });

    if (!audit) {
      return NextResponse.json({ error: 'Stock audit session not found' }, { status: 404 });
    }

    return NextResponse.json(audit);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch stock audit details' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const roleHeader = req.headers.get('x-user-role');
    const session = checkAuth(roleHeader);

    if (!hasPermission(session.role, 'stock:audit')) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    const audit = await prisma.stockAudit.findUnique({ where: { id: params.id } });
    if (!audit) return NextResponse.json({ error: 'Audit session not found' }, { status: 404 });
    if (audit.status !== 'IN_PROGRESS') {
      return NextResponse.json({ error: 'Cannot edit completed or cancelled audit session' }, { status: 400 });
    }

    const body = await req.json();
    const { productId, countedQty, notes } = body;

    if (!productId || countedQty === undefined) {
      return NextResponse.json({ error: 'Product ID and counted quantity are required' }, { status: 400 });
    }

    const auditItem = await prisma.stockAuditItem.findUnique({
      where: { auditId_productId: { auditId: params.id, productId } },
      include: { product: true },
    });

    if (!auditItem) {
      return NextResponse.json({ error: 'Product item not found in audit session' }, { status: 404 });
    }

    const count = Math.max(0, parseInt(countedQty));
    const variance = count - auditItem.systemQty;
    const value = variance * auditItem.unitCost;

    const updatedItem = await prisma.stockAuditItem.update({
      where: { id: auditItem.id },
      data: {
        countedQty: count,
        varianceQty: variance,
        varianceValue: value,
        notes: notes !== undefined ? notes : auditItem.notes,
      },
      include: { product: true },
    });

    return NextResponse.json(updatedItem);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to update counted quantity' }, { status: 400 });
  }
}
