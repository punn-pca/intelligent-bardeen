import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { createAuditLog } from '@/lib/audit-logger';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { bundleProductId, warehouseId, quantity, createdById } = body;

    if (!bundleProductId || !warehouseId || !quantity || quantity <= 0) {
      return NextResponse.json({ error: 'bundleProductId, warehouseId, and valid quantity are required' }, { status: 400 });
    }

    const qty = parseFloat(quantity);
    const userId = createdById || 'usr-admin';

    // Get Bundle Components
    const bundleItems = await prisma.bundleItem.findMany({
      where: { bundleProductId },
      include: { componentProduct: true },
    });

    if (bundleItems.length === 0) {
      return NextResponse.json({ error: 'This product has no registered BOM components' }, { status: 400 });
    }

    // Generate Work Order No G2608-...
    const yearMonth = new Date().toISOString().slice(2, 7).replace('-', '');
    const count = await prisma.assemblyOrder.count();
    const assemblyNo = `G${yearMonth}-${(count + 1).toString().padStart(5, '0')}`;

    // Execute Stock Transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Deduct component stocks
      for (const item of bundleItems) {
        const requiredQty = item.quantity * qty;

        const inv = await tx.inventory.findUnique({
          where: { productId_warehouseId: { productId: item.componentProductId, warehouseId } },
        });

        const beforeOnHand = inv?.onHand || 0;
        const afterOnHand = beforeOnHand - requiredQty;

        await tx.inventory.upsert({
          where: { productId_warehouseId: { productId: item.componentProductId, warehouseId } },
          update: { onHand: afterOnHand },
          create: { productId: item.componentProductId, warehouseId, onHand: afterOnHand },
        });

        await tx.stockMovement.create({
          data: {
            type: 'ISSUE',
            productId: item.componentProductId,
            warehouseId,
            quantity: -requiredQty,
            beforeOnHand,
            afterOnHand,
            createdById: userId,
            reference: assemblyNo,
            reason: `Deducted for Assembly Work Order ${assemblyNo}`,
          },
        });
      }

      // 2. Add finished good stock
      const finishedInv = await tx.inventory.findUnique({
        where: { productId_warehouseId: { productId: bundleProductId, warehouseId } },
      });

      const finishedBefore = finishedInv?.onHand || 0;
      const finishedAfter = finishedBefore + qty;

      await tx.inventory.upsert({
        where: { productId_warehouseId: { productId: bundleProductId, warehouseId } },
        update: { onHand: finishedAfter },
        create: { productId: bundleProductId, warehouseId, onHand: finishedAfter },
      });

      await tx.stockMovement.create({
        data: {
          type: 'RECEIVE',
          productId: bundleProductId,
          warehouseId,
          quantity: qty,
          beforeOnHand: finishedBefore,
          afterOnHand: finishedAfter,
          createdById: userId,
          reference: assemblyNo,
          reason: `Finished Goods Assembly Work Order ${assemblyNo}`,
        },
      });

      // 3. Create Assembly Order
      const assembly = await tx.assemblyOrder.create({
        data: {
          assemblyNo,
          finishedProductId: bundleProductId,
          warehouseId,
          quantity: qty,
          status: 'COMPLETED',
          notes: `Assembling ${qty} set(s) via BOM Engine`,
          createdById: userId,
        },
        include: { finishedProduct: true },
      });

      return assembly;
    });

    await createAuditLog({
      userId,
      username: 'admin',
      action: 'EXECUTE_ASSEMBLY',
      entity: 'AssemblyOrder',
      entityId: result.id,
      afterData: { assemblyNo, bundleProductId, quantity: qty },
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Assembly failed' }, { status: 500 });
  }
}
