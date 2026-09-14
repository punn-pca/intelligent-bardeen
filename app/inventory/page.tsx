'use client';

import React, { useState, useEffect } from 'react';
import { Boxes, Search, Filter, Warehouse as WarehouseIcon, FileSpreadsheet, Download } from 'lucide-react';
import Link from 'next/link';
import { CardSkeleton, TableSkeleton } from '@/components/common/Skeleton';

export default function InventoryPage() {
  const [items, setItems] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [selectedWarehouse, setSelectedWarehouse] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [loading, setLoading] = useState(true);

  async function loadInventory() {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (selectedWarehouse) params.append('warehouseId', selectedWarehouse);
      if (selectedCategory) params.append('categoryId', selectedCategory);
      if (selectedStatus) params.append('status', selectedStatus);

      const [invRes, whRes, catRes] = await Promise.all([
        fetch(`/api/inventory?${params.toString()}`),
        fetch('/api/warehouses'),
        fetch('/api/categories'),
      ]);

      const invData = await invRes.json();
      const whData = await whRes.json();
      const catData = await catRes.json();

      setItems(invData.data || []);
      setSummary(invData.summary || null);
      setWarehouses(whData || []);
      setCategories(catData || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadInventory();
  }, [search, selectedWarehouse, selectedCategory, selectedStatus]);

  const exportToCSV = () => {
    if (items.length === 0) return;

    const headers = ['รหัสสินค้า (SKU)', 'ชื่อสินค้า', 'หมวดหมู่', 'ยอดยกมา', 'รับสต๊อค', 'เบิกออก', 'ส่งตัวแทน', 'ขาย Shopee', 'ยอดคงเหลือสุทธิ', 'สถานะ'];
    const csvRows = [headers.join(',')];

    items.forEach((item) => {
      const row = [
        `"${item.sku}"`,
        `"${item.productName.replace(/"/g, '""')}"`,
        `"${item.categoryName.replace(/"/g, '""')}"`,
        item.openingBalance,
        item.stockIn,
        item.stockOut,
        item.dealerOut,
        item.shopeeOut,
        item.onHand,
        `"${item.status}"`,
      ];
      csvRows.push(row.join(','));
    });

    const blob = new Blob(['\uFEFF' + csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Stock_Matrix_Excel_Report_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <FileSpreadsheet className="w-7 h-7 text-emerald-600 dark:text-emerald-400" />
            <span>ตารางสต๊อกสินค้าหลัก (Excel Stock Ledger Matrix 1:1)</span>
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            โครงสร้างตารางอิงแบบฟอร์ม Excel หน้า <code className="bg-emerald-50 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 font-bold px-2 py-0.5 rounded font-mono text-xs border border-emerald-200 dark:border-emerald-800">STOCK</code> (ยอดยกมา, รับเข้า, เบิกออก, ส่งตัวแทน, ขาย Shopee, ยอดคงเหลือ)
          </p>
        </div>

        <button
          onClick={exportToCSV}
          className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-2 shadow-xs transition-all shrink-0"
        >
          <Download className="w-4 h-4" />
          <span>ส่งออก Excel (CSV)</span>
        </button>
      </div>

      {/* Summary Cards */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : (
        summary && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800/80 shadow-xs">
              <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold uppercase">จำนวนรายการสินค้าทั้งหมด</p>
              <p className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-1">{summary.totalItems.toLocaleString()} รายการ</p>
            </div>
            <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800/80 shadow-xs">
              <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold uppercase">ยอดรวมสต๊อกคงเหลือ</p>
              <p className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-1">{summary.totalOnHand.toLocaleString()} ชิ้น</p>
            </div>
            <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800/80 shadow-xs">
              <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold uppercase">มูลค่าสต็อกรวม</p>
              <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">฿{summary.totalValuation.toLocaleString('th-TH')}</p>
            </div>
            <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800/80 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold uppercase">สถานะสต็อกเตือนภัย</p>
                <p className="text-sm font-bold text-slate-800 dark:text-slate-200 mt-1">
                  <span className="text-amber-600 dark:text-amber-400">{summary.lowStockCount} ใกล้หมด</span> / <span className="text-rose-600 dark:text-rose-400">{summary.outOfStockCount} หมดสต็อก</span>
                </p>
              </div>
            </div>
          </div>
        )
      )}

      {/* Filter Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800/80 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400 dark:text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ค้นหา SKU, Barcode, ชื่อสินค้า..."
            className="w-full text-sm outline-none bg-transparent text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 font-mono"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Filter className="w-4 h-4 text-slate-400 dark:text-slate-500" />
          <select
            value={selectedWarehouse}
            onChange={(e) => setSelectedWarehouse(e.target.value)}
            className="text-xs border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 outline-none font-medium"
          >
            <option value="">ทุกคลังสินค้า</option>
            {warehouses.map((wh) => (
              <option key={wh.id} value={wh.id}>
                {wh.code} - {wh.name}
              </option>
            ))}
          </select>

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="text-xs border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 outline-none font-medium"
          >
            <option value="">ทุกหมวดหมู่</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="text-xs border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 outline-none font-medium"
          >
            <option value="">ทุกสถานะ (All Status)</option>
            <option value="IN_STOCK">IN STOCK</option>
            <option value="LOW_STOCK">LOW STOCK</option>
            <option value="OUT_OF_STOCK">OUT OF STOCK</option>
            <option value="OVER_STOCK">OVER STOCK</option>
          </select>
        </div>
      </div>

      {/* Excel Sheet STOCK Layout Matrix Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 uppercase font-bold border-b border-slate-300 dark:border-slate-700">
              <tr>
                <th className="p-3">รหัสสินค้า (SKU)</th>
                <th className="p-3">รายการสินค้า (Description)</th>
                <th className="p-3 text-right bg-slate-200/50 dark:bg-slate-800">ยอดยกมา</th>
                <th className="p-3 text-right text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40">รับเข้า</th>
                <th className="p-3 text-right text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40">เบิกออก</th>
                <th className="p-3 text-right text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40">ตัวแทน</th>
                <th className="p-3 text-right text-purple-700 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/40">Shopee</th>
                <th className="p-3 text-right bg-amber-100/60 dark:bg-amber-950/60 font-black text-slate-900 dark:text-amber-300">ยอดคงเหลือ</th>
                <th className="p-3 text-center">สถานะ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={9} className="p-4">
                    <TableSkeleton rows={8} cols={9} />
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-8 text-slate-400 dark:text-slate-500">
                    ไม่พบรายการสินค้าในตาราง
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all font-mono">
                    <td className="p-3 font-bold text-slate-900 dark:text-slate-100">{item.sku}</td>
                    <td className="p-3 font-sans">
                      <Link href={`/products/${item.productId}`} className="font-semibold text-slate-800 dark:text-slate-200 hover:text-emerald-600 dark:hover:text-emerald-400 hover:underline">
                        {item.productName}
                      </Link>
                      <p className="text-[11px] text-slate-400 dark:text-slate-500">{item.categoryName}</p>
                    </td>
                    <td className="p-3 text-right text-slate-600 dark:text-slate-400 bg-slate-50/50 dark:bg-slate-900/40">{item.openingBalance}</td>
                    <td className="p-3 text-right font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50/30 dark:bg-emerald-950/20">+{item.stockIn}</td>
                    <td className="p-3 text-right font-semibold text-rose-600 dark:text-rose-400 bg-rose-50/30 dark:bg-rose-950/20">-{item.stockOut}</td>
                    <td className="p-3 text-right font-semibold text-blue-600 dark:text-blue-400 bg-blue-50/30 dark:bg-blue-950/20">-{item.dealerOut}</td>
                    <td className="p-3 text-right font-semibold text-purple-600 dark:text-purple-400 bg-purple-50/30 dark:bg-purple-950/20">-{item.shopeeOut}</td>
                    <td className="p-3 text-right font-black text-slate-900 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 text-sm">
                      {item.onHand}
                    </td>
                    <td className="p-3 text-center font-sans">
                      <span
                        className={`px-2 py-0.5 rounded text-[11px] font-bold border ${
                          item.status === 'OUT_OF_STOCK'
                            ? 'bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800'
                            : item.status === 'LOW_STOCK'
                            ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                            : item.status === 'OVER_STOCK'
                            ? 'bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800'
                            : 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                        }`}
                      >
                        {item.status === 'OUT_OF_STOCK'
                          ? 'หมดสต็อก'
                          : item.status === 'LOW_STOCK'
                          ? 'ใกล้หมด'
                          : item.status === 'OVER_STOCK'
                          ? 'ล้นสต็อก'
                          : 'ปกติ'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
