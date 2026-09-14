import { prisma } from '@/lib/db';
import { recordAuditLog } from '@/lib/audit-logger';
import { getLowStockProducts } from '@/lib/erp-queries';

export interface PurchaseOrderDraft {
  draftId: string;
  status: 'PENDING_HUMAN_APPROVAL' | 'APPROVED' | 'REJECTED' | 'EXECUTED';
  supplierId?: string;
  supplierName?: string;
  items: Array<{
    sku: string;
    productName: string;
    suggestedQty: number;
    estimatedUnitCost: number;
    totalAmount: number;
  }>;
  totalEstimatedAmount: number;
  createdBy: string;
  createdAt: string;
  notes: string;
}

export async function createPurchaseOrderDraft(input: {
  userId: string;
  username: string;
  notes?: string;
}): Promise<PurchaseOrderDraft> {
  const lowStock = await getLowStockProducts();
  const reorderItems = lowStock.slice(0, 10);

  const draftId = `PO-DRAFT-${Date.now()}`;
  let totalEstimatedAmount = 0;

  const items = reorderItems.map(item => {
    const suggestedQty = Math.max(10, (item.minStock * 2) - item.onHand);
    const estimatedUnitCost = item.costPrice || 100;
    const totalAmount = suggestedQty * estimatedUnitCost;
    totalEstimatedAmount += totalAmount;

    return {
      sku: item.sku,
      productName: item.name,
      suggestedQty,
      estimatedUnitCost,
      totalAmount,
    };
  });

  const draft: PurchaseOrderDraft = {
    draftId,
    status: 'PENDING_HUMAN_APPROVAL',
    notes: input.notes || 'AI Generated Purchase Order Draft based on low stock analysis.',
    items,
    totalEstimatedAmount: Math.round(totalEstimatedAmount * 100) / 100,
    createdBy: input.username,
    createdAt: new Date().toISOString(),
  };

  await recordAuditLog({
    userId: input.userId,
    username: input.username,
    action: 'CREATE_PO_DRAFT',
    entity: 'PurchaseOrderDraft',
    entityId: draftId,
    afterData: JSON.stringify({ draftId, itemsCount: items.length, totalEstimatedAmount }),
  });

  return draft;
}
