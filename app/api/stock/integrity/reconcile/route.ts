import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { checkAuth, hasPermission } from '@/lib/auth';
import { createAuditLog } from '@/lib/audit-logger';

export async function POST(req: NextRequest) {
  try {
    const userRole = req.headers.get('x-user-role');
    const user = checkAuth(userRole);

    if (!hasPermission(user.role, 'stock:integrity')) {
      return NextResponse.json({ error: 'You do not have permission' }, { status: 403 });
    }

    const inventories = await prisma.inventory.findMany({
      include: { product: true, warehouse: true },
    });

    let fixedCount = 0;

    for (const inv of inventories) {
      const movements = await prisma.stockMovement.findMany({
        where: { productId: inv.productId, warehouseId: inv.warehouseId },
      });

      const calculatedOnHand = movements.reduce((acc, curr) => acc + curr.quantity, 0);
      const diff = inv.onHand - calculatedOnHand;

      if (diff !== 0) {
        const transactionId = `TX-INIT-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

        await prisma.stockTransaction.create({
          data: {
            id: transactionId,
            type: 'STOCK_IN',
            reference: 'SYSTEM-RECONCILE-INITIAL',
            note: 'ปรับปรุงยอดยกมาเริ่มต้นให้สอดคล้องกับสต็อกใน DB',
            createdById: user.id,
            items: {
              create: [{
                productId: inv.productId,
                warehouseId: inv.warehouseId,
                quantity: diff,
                costPrice: inv.product.costPrice || 0,
                reason: 'Initial Stock Reconciliation',
              }],
            },
          },
        });

        await prisma.stockMovement.create({
          data: {
            transactionId,
            type: 'RECEIPT',
            productId: inv.productId,
            warehouseId: inv.warehouseId,
            quantity: diff,
            unitCost: inv.product.costPrice || 0,
            totalCost: diff * (inv.product.costPrice || 0),
            beforeOnHand: calculatedOnHand,
            afterOnHand: inv.onHand,
            createdById: user.id,
            reference: 'SYSTEM-RECONCILE-INITIAL',
            reason: 'Auto Reconciled Initial Stock',
          },
        });

        fixedCount++;
      }
    }

    await createAuditLog({
      userId: user.id,
      username: user.username,
      action: 'RECONCILE_STOCK_INTEGRITY',
      entity: 'StockIntegrity',
      entityId: 'reconcile-all',
      afterData: { fixedCount },
    });

    return NextResponse.json({
      success: true,
      message: `ปรับปรุงความถูกต้องของสต็อกเรียบร้อยแล้ว จำนวน ${fixedCount} รายการ`,
      fixedCount,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Reconciliation failed' }, { status: 500 });
  }
}
