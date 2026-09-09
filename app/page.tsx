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
  Legend,
} from 'recharts';

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
  const [dailyData, setDailyData] = useState<any[]>([]);
  const [categoryValuation, setCategoryValuation] = useState<any[]>([]);
  const [topMovements, setTopMovements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboardData() {
      try {
        setLoading(true);

        const [prodRes, invRes, movRes, catRes] = await Promise.all([
          fetch('/api/products?limit=2000'),
          fetch('/api/inventory'),
          fetch('/api/stock/movements?limit=1000'),
          fetch('/api/categories'),
        ]);

        const prodData = await prodRes.json();
        const invData = await invRes.json();
        const movData = await movRes.json();
        const catData = await catRes.json();

        const prods = prodData.data || (Array.isArray(prodData) ? prodData : []);
        const invs = invData.data || (Array.isArray(invData) ? invData : []);
        const movs = movData.data || (Array.isArray(movData) ? movData : []);

        // Metric Calculations
        const totalProducts = prodData.pagination?.total || prods.length;
        const totalSku = prodData.pagination?.total || prods.length;
        const inStockCount = prods.filter((p: any) => p.stockStatus === 'IN_STOCK').length;
        const lowStockCount = prods.filter((p: any) => p.stockStatus === 'LOW_STOCK').length;
        const outOfStockCount = prods.filter((p: any) => p.stockStatus === 'OUT_OF_STOCK').length;

        const totalValuation = invs.reduce((acc: number, item: any) => acc + item.stockValue, 0);

        // Today In / Out
        const todayStr = new Date().toISOString().slice(0, 10);
        let todayIn = 0;
        let todayOut = 0;

        movs.forEach((m: any) => {
          const mDate = new Date(m.createdAt).toISOString().slice(0, 10);
          if (mDate === todayStr) {
            if (m.type === 'RECEIVE' || m.type === 'STOCK_IN') todayIn += Math.abs(m.quantity);
            if (m.type === 'ISSUE' || m.type === 'STOCK_OUT') todayOut += Math.abs(m.quantity);
          }
        });

        setMetrics({
          totalProducts,
          totalSku,
          inStockCount,
          lowStockCount,
          outOfStockCount,
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

  const COLORS = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Dashboard บริหารคลังสินค้า</h1>
          <p className="text-sm text-slate-500 mt-1">
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
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500">จำนวนสินค้าทั้งหมด</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black text-slate-900 font-mono">
                {loading ? '...' : metrics.totalProducts.toLocaleString()}
              </span>
              <span className="text-xs text-slate-500 font-medium">รายการ</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600">
            <Package className="w-5 h-5" />
          </div>
        </div>

        {/* Total SKUs */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500">จำนวน SKU</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black text-slate-900 font-mono">
                {loading ? '...' : metrics.totalSku.toLocaleString()}
              </span>
              <span className="text-xs text-slate-500 font-medium">SKU</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
            <Boxes className="w-5 h-5" />
          </div>
        </div>

        {/* Total Valuation */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500">มูลค่าสต็อกรวม</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black text-emerald-600 font-mono">
                ฿{loading ? '...' : metrics.totalValuation.toLocaleString(undefined, { minimumFractionDigits: 0 })}
              </span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
            <CircleDollarSign className="w-5 h-5" />
          </div>
        </div>

        {/* Low Stock Warning */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500">สินค้าใกล้หมด</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black text-amber-600 font-mono">
                {loading ? '...' : metrics.lowStockCount.toLocaleString()}
              </span>
              <span className="text-xs text-slate-500 font-medium">รายการ</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>

        {/* Out of Stock */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500">สินค้าหมดสต็อก</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black text-rose-600 font-mono">
                {loading ? '...' : metrics.outOfStockCount.toLocaleString()}
              </span>
              <span className="text-xs text-slate-500 font-medium">รายการ</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center text-rose-600">
            <XCircle className="w-5 h-5" />
          </div>
        </div>

        {/* Today Stock In */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500">รับเข้าวันนี้</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black text-emerald-600 font-mono">
                +{loading ? '...' : metrics.todayStockIn.toLocaleString()}
              </span>
              <span className="text-xs text-slate-500 font-medium">ชิ้น</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
            <ArrowDownRight className="w-5 h-5" />
          </div>
        </div>

        {/* Today Stock Out */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500">เบิกออกวันนี้</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black text-rose-600 font-mono">
                -{loading ? '...' : metrics.todayStockOut.toLocaleString()}
              </span>
              <span className="text-xs text-slate-500 font-medium">ชิ้น</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center text-rose-600">
            <ArrowUpRight className="w-5 h-5" />
          </div>
        </div>

        {/* Recent Movements */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500">รายการเคลื่อนไหวล่าสุด</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black text-purple-600 font-mono">
                {loading ? '...' : metrics.recentMovementsCount.toLocaleString()}
              </span>
              <span className="text-xs text-slate-500 font-medium">ครั้ง</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600">
            <History className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Analytics Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Bar Chart: Daily Stock Movement */}
        <div className="lg:col-span-2 bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-blue-600" />
              <h2 className="font-bold text-slate-900 text-sm">การเคลื่อนไหวสต็อกประจำวัน (7 วันล่าสุด)</h2>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    border: 'none',
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
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center gap-2">
            <PieChartIcon className="w-5 h-5 text-indigo-600" />
            <h2 className="font-bold text-slate-900 text-sm">สัดส่วนมูลค่าสต็อกตามหมวดหมู่</h2>
          </div>

          <div className="h-64 w-full flex items-center justify-center">
            {categoryValuation.length === 0 ? (
              <span className="text-xs text-slate-400">ไม่มีข้อมูลหมวดหมู่</span>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryValuation}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
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
                      border: 'none',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '12px',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Tables Row: Low Stock Warning & Top Fast-Moving Products */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Low Stock Table */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              <h2 className="font-bold text-slate-900 text-sm">รายการสินค้าต้องเฝ้าระวัง (Low & Out of Stock)</h2>
            </div>
            <Link href="/inventory" className="text-xs text-blue-600 font-semibold hover:underline">
              ดูตารางสต็อกทั้งหมด →
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase">
                <tr>
                  <th className="p-3">SKU</th>
                  <th className="p-3">ชื่อสินค้า</th>
                  <th className="p-3">หมวดหมู่</th>
                  <th className="p-3 text-right">คงเหลือรวม</th>
                  <th className="p-3 text-center">สถานะ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {lowStockProducts.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-6 text-slate-400">
                      ไม่มีสินค้าใกล้หมดสต็อก
                    </td>
                  </tr>
                ) : (
                  lowStockProducts.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50">
                      <td className="p-3 font-mono font-bold text-slate-900">{p.sku}</td>
                      <td className="p-3 font-semibold text-slate-800">{p.name}</td>
                      <td className="p-3 text-slate-500">{p.category?.name || '-'}</td>
                      <td className="p-3 text-right font-mono font-bold">{p.totalOnHand}</td>
                      <td className="p-3 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            p.stockStatus === 'OUT_OF_STOCK'
                              ? 'bg-rose-100 text-rose-700'
                              : 'bg-amber-100 text-amber-700'
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
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-4 space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <TrendingUp className="w-5 h-5 text-emerald-600" />
            <h2 className="font-bold text-slate-900 text-sm">สินค้ายอดนิยมเคลื่อนไหวสูงสุด (Fast-Moving)</h2>
          </div>

          <div className="space-y-3">
            {topMovements.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-4">ยังไม่มีประวัติการหมุนเวียนสินค้า</p>
            ) : (
              topMovements.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg text-xs">
                  <div className="flex items-center gap-2 truncate">
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-[10px]">
                      {idx + 1}
                    </span>
                    <span className="font-semibold text-slate-800 truncate">{item.name}</span>
                  </div>
                  <span className="font-mono font-bold text-blue-600 shrink-0">{item.count} ชิ้น</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
