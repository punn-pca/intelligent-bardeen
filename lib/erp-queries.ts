import { prisma } from '@/lib/db';

export interface InventoryIntelligenceResult {
  totalActiveProducts: number;
  totalInStockProducts: number;
  totalOutOfStockProducts: number;
  totalLowStockProducts: number;
  totalInventoryOnHand: number;
  totalInventoryValue: number;
  abcAnalysis: {
    categoryA: { count: number; valueRatio: number };
    categoryB: { count: number; valueRatio: number };
    categoryC: { count: number; valueRatio: number };
  };
  reorderCandidates: Array<{
    sku: string;
    name: string;
    category: string;
    onHand: number;
    minStock: number;
    reorderQuantity: number;
    warehouse: string;
    unitCost: number;
  }>;
}

export async function getActiveProducts(take = 50) {
  return await prisma.product.findMany({
    where: { isDeleted: false, active: true },
    include: {
      category: true,
      inventories: { include: { warehouse: true } },
    },
    orderBy: { name: 'asc' },
    take,
  });
}

export async function getInStockProducts() {
  const inventories = await prisma.inventory.findMany({
    where: { onHand: { gt: 0 } },
    include: {
      product: { include: { category: true } },
      warehouse: true,
    },
    orderBy: { product: { name: 'asc' } },
  });

  const productMap = new Map<string, {
    productId: string;
    sku: string;
    name: string;
    category: string;
    sellingPrice: number;
    costPrice: number;
    totalOnHand: number;
    warehouses: string[];
  }>();

  inventories.forEach(inv => {
    const existing = productMap.get(inv.productId);
    if (existing) {
      existing.totalOnHand += inv.onHand;
      existing.warehouses.push(`${inv.warehouse.name}: ${inv.onHand}`);
    } else {
      productMap.set(inv.productId, {
        productId: inv.productId,
        sku: inv.product.sku,
        name: inv.product.name,
        category: inv.product.category.name,
        sellingPrice: inv.product.sellingPrice,
        costPrice: inv.product.costPrice,
        totalOnHand: inv.onHand,
        warehouses: [`${inv.warehouse.name}: ${inv.onHand}`],
      });
    }
  });

  return Array.from(productMap.values());
}

export async function getOutOfStockProducts() {
  const allProducts = await prisma.product.findMany({
    where: { isDeleted: false },
    include: {
      category: true,
      inventories: { include: { warehouse: true } },
    },
  });

  return allProducts
    .map(p => {
      const onHand = p.inventories.reduce((sum, inv) => sum + inv.onHand, 0);
      const warehouses = p.inventories.map(i => i.warehouse.name).join(', ') || 'ไม่มีคลัง';
      return {
        id: p.id,
        sku: p.sku,
        name: p.name,
        category: p.category.name,
        onHand,
        minStock: p.minStock || 0,
        costPrice: p.costPrice,
        sellingPrice: p.sellingPrice,
        warehouses,
      };
    })
    .filter(p => p.onHand === 0);
}

export async function getLowStockProducts() {
  const allProducts = await prisma.product.findMany({
    where: { isDeleted: false },
    include: {
      category: true,
      inventories: { include: { warehouse: true } },
    },
  });

  return allProducts
    .map(p => {
      const onHand = p.inventories.reduce((sum, inv) => sum + inv.onHand, 0);
      const warehouses = p.inventories.map(i => i.warehouse.name).join(', ') || 'ไม่มีคลัง';
      return {
        id: p.id,
        sku: p.sku,
        name: p.name,
        category: p.category.name,
        onHand,
        minStock: p.minStock || 0,
        costPrice: p.costPrice,
        sellingPrice: p.sellingPrice,
        warehouses,
      };
    })
    .filter(p => p.onHand >= 0 && (p.onHand <= p.minStock || p.onHand === 0))
    .sort((a, b) => a.onHand - b.onHand);
}

export async function getInventorySummary() {
  const [totalProducts, totalWarehouses, totalDocuments, inventorySum] = await Promise.all([
    prisma.product.count({ where: { isDeleted: false } }).catch(() => 0),
    prisma.warehouse.count({ where: { active: true } }).catch(() => 0),
    prisma.document.count().catch(() => 0),
    prisma.inventory.aggregate({ _sum: { onHand: true } }).catch(() => ({ _sum: { onHand: 0 } })),
  ]);

  return {
    totalActiveProducts: totalProducts,
    totalWarehouses,
    totalDocuments,
    totalInventoryStock: inventorySum._sum?.onHand || 0,
  };
}

export async function getCategorySummary() {
  const categories = await prisma.category.findMany({
    include: {
      _count: { select: { products: { where: { isDeleted: false } } } },
    },
    orderBy: { name: 'asc' },
  });

  return categories.map(c => ({
    id: c.id,
    name: c.name,
    productCount: c._count.products,
  }));
}

export async function getWarehouseSummary() {
  const warehouses = await prisma.warehouse.findMany({
    where: { active: true },
    include: {
      inventories: {
        include: { product: true },
      },
    },
  });

  return warehouses.map(w => {
    const totalItems = w.inventories.reduce((sum, inv) => sum + inv.onHand, 0);
    return {
      id: w.id,
      code: w.code,
      name: w.name,
      address: w.address,
      totalItems,
      productTypesCount: w.inventories.length,
    };
  });
}

export async function getCompanyProfile() {
  const setting = await prisma.companySetting.findFirst();
  return setting || {
    id: 'default',
    name: 'บริษัท เอส แอนด์ บี อิเล็กทรอนิกส์ เซอร์วิส จำกัด',
    taxId: '0105555081714',
    address: '120/288 หมู่ที่ 5 ตำบลบางเดื่อ อำเภอเมืองปทุมธานี จ.ปทุมธานี 12000',
    phone: '02-789-9999',
    email: 'info@sb-electronic.co.th',
    website: 'www.sb-electronic.co.th',
    logoUrl: null,
    bankName: 'ธนาคารกสิกรไทย (KBANK)',
    bankAccountNo: '123-4-56789-0',
    bankAccountName: 'บจก. เอส แอนด์ บี อิเล็กทรอนิกส์ เซอร์วิส',
  };
}

export async function calculateInventoryIntelligence(): Promise<InventoryIntelligenceResult> {
  const products = await prisma.product.findMany({
    where: { isDeleted: false },
    include: {
      category: true,
      inventories: { include: { warehouse: true } },
    },
  });

  let totalActiveProducts = products.length;
  let totalInStockProducts = 0;
  let totalOutOfStockProducts = 0;
  let totalLowStockProducts = 0;
  let totalInventoryOnHand = 0;
  let totalInventoryValue = 0;

  const productValueList: Array<{ sku: string; name: string; category: string; value: number }> = [];
  const reorderCandidates: InventoryIntelligenceResult['reorderCandidates'] = [];

  products.forEach(p => {
    const onHand = p.inventories.reduce((sum, inv) => sum + inv.onHand, 0);
    const minStock = p.minStock || 5;
    const warehouseStr = p.inventories.map(i => i.warehouse.name).join(', ') || 'ไม่มีคลัง';
    const unitCost = p.costPrice || 0;
    const val = onHand * unitCost;

    totalInventoryOnHand += onHand;
    totalInventoryValue += val;

    if (onHand > 0) {
      totalInStockProducts++;
      productValueList.push({ sku: p.sku, name: p.name, category: p.category.name, value: val });
    } else {
      totalOutOfStockProducts++;
    }

    if (onHand <= minStock) {
      totalLowStockProducts++;
      const reorderQuantity = Math.max(10, (minStock * 2) - onHand);
      reorderCandidates.push({
        sku: p.sku,
        name: p.name,
        category: p.category.name,
        onHand,
        minStock,
        reorderQuantity,
        warehouse: warehouseStr,
        unitCost,
      });
    }
  });

  // ABC Analysis by inventory value
  productValueList.sort((a, b) => b.value - a.value);
  const totalVal = Math.max(1, totalInventoryValue);

  let cumulativeVal = 0;
  let catACount = 0;
  let catBCount = 0;
  let catCCount = 0;

  productValueList.forEach(p => {
    cumulativeVal += p.value;
    const pct = cumulativeVal / totalVal;
    if (pct <= 0.70) catACount++;
    else if (pct <= 0.90) catBCount++;
    else catCCount++;
  });

  return {
    totalActiveProducts,
    totalInStockProducts,
    totalOutOfStockProducts,
    totalLowStockProducts,
    totalInventoryOnHand,
    totalInventoryValue: Math.round(totalInventoryValue * 100) / 100,
    abcAnalysis: {
      categoryA: { count: catACount, valueRatio: 0.70 },
      categoryB: { count: catBCount, valueRatio: 0.20 },
      categoryC: { count: catCCount, valueRatio: 0.10 },
    },
    reorderCandidates: reorderCandidates.sort((a, b) => a.onHand - b.onHand),
  };
}
