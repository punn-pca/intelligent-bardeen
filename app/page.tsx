'use client';

import React, { useState, useEffect } from 'react';
import {
  Package,
  Boxes,
  AlertTriangle,
  XCircle,
  CircleDollarSign,
  ArrowDownRight,
  ArrowUpRight,
  History,
  TrendingUp,
  BarChart3,
  PieChart as PieChartIcon,
} from 'lucide-react';
import Link from 'next/link';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { CardSkeleton, TableSkeleton, ChartSkeleton } from '@/components/common/Skeleton';

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<any>({
    totalProducts: 0,
    totalSku: 0,
    inStockCount: 0,
    lowStockCount: 0,
    outOfStockCount: 0,
    totalValuation: 0,
    todayStockIn: 0,
    todayStockOut: 0,
    recentMovementsCount: 0,
  });

  const [lowStockProducts, setLowStockProducts] = useState<any[]>([]);
  const [categoryValuation, setCategoryValuation] = useState<any[]>([]);
  const [dailyData, setDailyData] = useState<any[]>([]);
  const [topMovements, setTopMovements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboardData() {
      try {
        setLoading(true);
        const [prodRes, invRes, movRes] = await Promise.all([
          fetch('/api/products?limit=2000').then((r) => r.json()).catch(() => ({ data: [] })),
          fetch('/api/inventory').then((r) => r.json()).catch(() => ({ data: [] })),
          fetch('/api/stock/movements?limit=1000').then((r) => r.json()).catch(() => ({ data: [] })),
        ]);

        const prods = Array.isArray(prodRes) ? prodRes : prodRes.data || prodRes.products || [];
        const invs = Array.isArray(invRes) ? invRes : invRes.data || invRes.inventory || [];
        const movs = Array.isArray(movRes) ? movRes : movRes.data || movRes.movements || [];

        // Aggregate Metrics
        const totalProducts = prods.length;
        const totalSku = prods.filter((p: any) => p.sku).length;
        const inStock = prods.filter((p: any) => p.stockStatus === 'IN_STOCK').length;
        const lowStock = prods.filter((p: any) => p.stockStatus === 'LOW_STOCK').length;
        const outOfStock = prods.filter((p: any) => p.stockStatus === 'OUT_OF_STOCK').length;
        const totalValuation = invs.reduce((sum: number, item: any) => sum + (item.stockValue || 0), 0);

        // Movement totals for today
        const todayStr = new Date().toISOString().split('T')[0];
        let todayIn = 0;
        let todayOut = 0;

        movs.forEach((m: any) => {
          const mDate = new Date(m.createdAt).toISOString().split('T')[0];
          if (mDate === todayStr) {
            if (m.type === 'IN') todayIn += m.quantity;
            if (m.type === 'OUT') todayOut += Math.abs(m.quantity);
          }
        });

        setMetrics({
          totalProducts,
          totalSku,
          inStockCount: inStock,
          lowStockCount: lowStock,
          outOfStockCount: outOfStock,
          totalValuation,
          todayStockIn: todayIn,
          todayStockOut: todayOut,
          recentMovementsCount: movs.length,
        });

        // Filter low stock products for table
        setLowStockProducts(prods.filter((p: any) => p.stockStatus === 'LOW_STOCK' || p.stockStatus === 'OUT_OF_STOCK').slice(0, 10));

        // Category Valuation Pie Chart Data
        const catMap: Record<string, number> = {};
        invs.forEach((item: any) => {
          catMap[item.categoryName] = (catMap[item.categoryName] || 0) + item.stockValue;
        });

        const pieChartData = Object.entries(catMap).map(([name, value]) => ({ name, value }));
        setCategoryValuation(pieChartData);

        // Daily In / Out Chart Data
        const mockDaily = [
          { day: '20 Aug', stockIn: 120, stockOut: 45 },
          { day: '21 Aug', stockIn: 80, stockOut: 60 },
          { day: '22 Aug', stockIn: 150, stockOut: 90 },
          { day: '23 Aug', stockIn: 60, stockOut: 110 },
          { day: '24 Aug', stockIn: 200, stockOut: 75 },
          { day: '25 Aug', stockIn: 110, stockOut: 85 },
          { day: 'วันนี้', stockIn: todayIn || 0, stockOut: todayOut || 0 },
        ];
        setDailyData(mockDaily);

        // Top Movements Data
        const prodMovMap: Record<string, { name: string; count: number }> = {};
        movs.forEach((m: any) => {
          if (m.product) {
            if (!prodMovMap[m.productId]) {
              prodMovMap[m.productId] = { name: m.product.name, count: 0 };
            }
            prodMovMap[m.productId].count += Math.abs(m.quantity);
          }
        });

        const topList = Object.values(prodMovMap)
          .sort((a, b) => b.count - a.count)
          .slice(0, 5);

        setTopMovements(topList);
      } catch (error) {
        console.error('Error loading dashboard data:', error);
      } finally {
        setLoading(false);
      }
    }

    loadDashboardData();
  }, []);

  const COLORS = [
    '#2563eb', // Blue
    '#10b981', // Emerald
    '#f59e0b', // Amber
    '#ef4444', // Red
    '#8b5cf6', // Purple
    '#06b6d4', // Cyan
    '#ec4899', // Pink
    '#6366f1', // Indigo
    '#84cc16', // Lime
  ];

  if (loading) {
    return (
      <div className="space-y-6 animate-in fade-in duration-200">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">Dashboard บริหารคลังสินค้า</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              กำลังโหลดข้อมูลระบบและสต็อกสินค้า...
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <ChartSkeleton />
          </div>
          <ChartSkeleton />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <TableSkeleton rows={5} cols={5} />
          </div>
          <TableSkeleton rows={5} cols={2} />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Dashboard บริหารคลังสินค้า</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            ภาพรวมการเคลื่อนไหวสต็อก มูลค่าสินค้าคงคลัง และรายการสินค้าเตือนภัย
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/stock-in"
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold flex items-center gap-2 shadow-xs transition-all"
          >
            <ArrowDownRight className="w-4 h-4" />
            <span>+ รับสินค้าเข้า</span>
          </Link>
          <Link
            href="/stock-out"
            className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-sm font-semibold flex items-center gap-2 shadow-xs transition-all"
          >
            <ArrowUpRight className="w-4 h-4" />
            <span>- เบิกสินค้าออก</span>
          </Link>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Products */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800/80 shadow-xs flex items-center justify-between transition-colors">
          <div>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">จำนวนสินค้าทั้งหมด</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black text-slate-900 dark:text-slate-100 font-mono">
                {metrics.totalProducts.toLocaleString()}
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">รายการ</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300">
            <Package className="w-5 h-5" />
          </div>
        </div>

        {/* Total SKUs */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800/80 shadow-xs flex items-center justify-between transition-colors">
          <div>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">จำนวน SKU</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black text-slate-900 dark:text-slate-100 font-mono">
                {metrics.totalSku.toLocaleString()}
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">SKU</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 flex items-center justify-center text-blue-600 dark:text-blue-400">
            <Boxes className="w-5 h-5" />
          </div>
        </div>

        {/* Total Valuation */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800/80 shadow-xs flex items-center justify-between transition-colors">
          <div>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">มูลค่าสต็อกรวม</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
                ฿{metrics.totalValuation.toLocaleString(undefined, { minimumFractionDigits: 0 })}
              </span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
            <CircleDollarSign className="w-5 h-5" />
          </div>
        </div>

        {/* Low Stock Warning */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800/80 shadow-xs flex items-center justify-between transition-colors">
          <div>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">สินค้าใกล้หมด</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black text-amber-600 dark:text-amber-400 font-mono">
                {metrics.lowStockCount.toLocaleString()}
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">รายการ</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/60 flex items-center justify-center text-amber-600 dark:text-amber-400">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>

        {/* Out of Stock */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800/80 shadow-xs flex items-center justify-between transition-colors">
          <div>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">สินค้าหมดสต็อก</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black text-rose-600 dark:text-rose-400 font-mono">
                {metrics.outOfStockCount.toLocaleString()}
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">รายการ</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/60 flex items-center justify-center text-rose-600 dark:text-rose-400">
            <XCircle className="w-5 h-5" />
          </div>
        </div>

        {/* Today Stock In */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800/80 shadow-xs flex items-center justify-between transition-colors">
          <div>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">รับเข้าวันนี้</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
                +{metrics.todayStockIn.toLocaleString()}
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">ชิ้น</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
            <ArrowDownRight className="w-5 h-5" />
          </div>
        </div>

        {/* Today Stock Out */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800/80 shadow-xs flex items-center justify-between transition-colors">
          <div>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">เบิกออกวันนี้</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black text-rose-600 dark:text-rose-400 font-mono">
                -{metrics.todayStockOut.toLocaleString()}
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">ชิ้น</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/60 flex items-center justify-center text-rose-600 dark:text-rose-400">
            <ArrowUpRight className="w-5 h-5" />
          </div>
        </div>

        {/* Recent Movements */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800/80 shadow-xs flex items-center justify-between transition-colors">
          <div>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">รายการเคลื่อนไหวล่าสุด</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black text-purple-600 dark:text-purple-400 font-mono">
                {metrics.recentMovementsCount.toLocaleString()}
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">ครั้ง</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/60 flex items-center justify-center text-purple-600 dark:text-purple-400">
            <History className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Analytics Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Bar Chart: Daily Stock Movement */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800/80 shadow-xs space-y-4 transition-colors">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <h2 className="font-bold text-slate-900 dark:text-white text-sm">การเคลื่อนไหวสต็อกประจำวัน (7 วันล่าสุด)</h2>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                />
                <Bar dataKey="stockIn" name="รับเข้า (In)" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="stockOut" name="เบิกออก (Out)" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pie Chart: Valuation by Category */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800/80 shadow-xs space-y-4 flex flex-col justify-between transition-colors">
          <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
            <PieChartIcon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <h2 className="font-bold text-slate-900 dark:text-white text-sm">สัดส่วนมูลค่าสต็อกตามหมวดหมู่</h2>
          </div>

          {categoryValuation.length === 0 ? (
            <div className="h-64 flex items-center justify-center">
              <span className="text-xs text-slate-400 dark:text-slate-500">ไม่มีข้อมูลหมวดหมู่</span>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="h-44 w-full flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryValuation}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={70}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {categoryValuation.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: any) => [`฿${Number(value).toLocaleString()}`, 'มูลค่า']}
                      contentStyle={{
                        backgroundColor: '#0f172a',
                        borderColor: '#334155',
                        borderRadius: '8px',
                        color: '#fff',
                        fontSize: '12px',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Scrollable Custom Legend List */}
              <div className="max-h-36 overflow-y-auto space-y-2 pr-1 border-t border-slate-100 dark:border-slate-800 pt-3">
                {categoryValuation.map((item, index) => {
                  const totalVal = categoryValuation.reduce((sum, i) => sum + i.value, 0);
                  const color = COLORS[index % COLORS.length];
                  const pct = totalVal > 0 ? ((item.value / totalVal) * 100).toFixed(1) : '0';
                  return (
                    <div key={item.name} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 truncate pr-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: color }}
                        />
                        <span className="text-slate-700 dark:text-slate-300 font-medium truncate" title={item.name}>
                          {item.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 text-slate-600 dark:text-slate-400">
                        <span className="font-semibold text-slate-900 dark:text-slate-100">
                          ฿{item.value.toLocaleString()}
                        </span>
                        <span className="text-slate-400 dark:text-slate-500 text-[10px] min-w-[36px] text-right">
                          ({pct}%)
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tables Row: Low Stock Warning & Top Fast-Moving Products */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Low Stock Table */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800/80 shadow-xs overflow-hidden transition-colors">
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              <h2 className="font-bold text-slate-900 dark:text-white text-sm">รายการสินค้าต้องเฝ้าระวัง (Low & Out of Stock)</h2>
            </div>
            <Link href="/inventory" className="text-xs text-blue-600 dark:text-blue-400 font-semibold hover:underline">
              ดูตารางสต็อกทั้งหมด →
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 uppercase">
                <tr>
                  <th className="p-3">SKU</th>
                  <th className="p-3">ชื่อสินค้า</th>
                  <th className="p-3">หมวดหมู่</th>
                  <th className="p-3 text-right">คงเหลือรวม</th>
                  <th className="p-3 text-center">สถานะ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {lowStockProducts.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-6 text-slate-400 dark:text-slate-500">
                      ไม่มีสินค้าใกล้หมดสต็อก
                    </td>
                  </tr>
                ) : (
                  lowStockProducts.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="p-3 font-mono font-bold text-slate-900 dark:text-slate-100">{p.sku}</td>
                      <td className="p-3 font-semibold text-slate-800 dark:text-slate-200">{p.name}</td>
                      <td className="p-3 text-slate-500 dark:text-slate-400">{p.category?.name || '-'}</td>
                      <td className="p-3 text-right font-mono font-bold text-slate-900 dark:text-slate-100">{p.totalOnHand}</td>
                      <td className="p-3 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            p.stockStatus === 'OUT_OF_STOCK'
                              ? 'bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300'
                              : 'bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300'
                          }`}
                        >
                          {p.stockStatus === 'OUT_OF_STOCK' ? 'หมดสต็อก' : 'ใกล้หมด'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Top Fast-Moving Products Card */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800/80 shadow-xs p-4 space-y-4 transition-colors">
          <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
            <TrendingUp className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <h2 className="font-bold text-slate-900 dark:text-white text-sm">สินค้ายอดนิยมเคลื่อนไหวสูงสุด (Fast-Moving)</h2>
          </div>

          <div className="space-y-3">
            {topMovements.length === 0 ? (
              <p className="text-xs text-slate-400 dark:text-slate-500 text-center py-4">ยังไม่มีประวัติการหมุนเวียนสินค้า</p>
            ) : (
              topMovements.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-lg text-xs">
                  <div className="flex items-center gap-2 truncate">
                    <span className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 flex items-center justify-center font-bold text-[10px]">
                      {idx + 1}
                    </span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">{item.name}</span>
                  </div>
                  <span className="font-mono font-bold text-blue-600 dark:text-blue-400 shrink-0">{item.count} ชิ้น</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
