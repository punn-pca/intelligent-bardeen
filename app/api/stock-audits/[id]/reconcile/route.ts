import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { checkAuth, hasPermission } from '@/lib/auth';
import { recordAuditLog } from '@/lib/audit-logger';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const roleHeader = req.headers.get('x-user-role');
    const session = checkAuth(roleHeader);

    if (!hasPermission(session.role, 'stock:audit')) {
      return NextResponse.json({ error: 'Permission denied for stock audit reconciliation' }, { status: 403 });
    }

    const audit = await prisma.stockAudit.findUnique({
      where: { id: params.id },
      include: {
        warehouse: true,
        items: { include: { product: true } },
      },
    });

    if (!audit) return NextResponse.json({ error: 'Audit session not found' }, { status: 404 });
    if (audit.status === 'COMPLETED') {
      return NextResponse.json({ error: 'Audit session already completed and reconciled' }, { status: 400 });
    }

    // Reconcile in a transaction: update onHand and generate StockLedger ADJUST_IN / ADJUST_OUT records
    await prisma.$transaction(async (tx) => {
      for (const item of audit.items) {
        if (item.varianceQty !== 0) {
          const inv = await tx.inventory.findUnique({
            where: { productId_warehouseId: { productId: item.productId, warehouseId: audit.warehouseId } },
          });

          const beforeOnHand = inv ? inv.onHand : 0;
          const afterOnHand = item.countedQty;

          await tx.inventory.upsert({
            where: { productId_warehouseId: { productId: item.productId, warehouseId: audit.warehouseId } },
            update: { onHand: afterOnHand },
            create: { productId: item.productId, warehouseId: audit.warehouseId, onHand: afterOnHand, reserved: 0 },
          });

          const movementType = item.varianceQty > 0 ? 'ADJUST_IN' : 'ADJUST_OUT';
          await tx.stockMovement.create({
            data: {
              type: movementType,
              productId: item.productId,
              warehouseId: audit.warehouseId,
              quantity: item.varianceQty,
              unitCost: item.unitCost,
              totalCost: item.varianceValue,
              beforeOnHand,
              afterOnHand,
              createdById: session.id,
              reference: audit.auditNo,
              reason: `Physical Stock Count Audit Reconciled (${audit.auditNo})`,
            },
          });
        }
      }

      await tx.stockAudit.update({
        where: { id: params.id },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
        },
      });

      await recordAuditLog(
        {
          userId: session.id,
          username: session.username,
          action: 'RECONCILE_STOCK_AUDIT',
          entity: 'StockAudit',
          entityId: audit.id,
          afterData: JSON.stringify({ auditNo: audit.auditNo, status: 'COMPLETED' }),
        },
        tx
      );
    }, { timeout: 30000 });

    return NextResponse.json({
      success: true,
      message: `Stock Audit ${audit.auditNo} reconciled and applied to inventory successfully`,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to reconcile stock audit' }, { status: 400 });
  }
}
