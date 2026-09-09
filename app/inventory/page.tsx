'use client';

import React, { useState, useEffect } from 'react';
import { Boxes, Search, Filter, Warehouse as WarehouseIcon, FileSpreadsheet, Download } from 'lucide-react';
import Link from 'next/link';

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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <FileSpreadsheet className="w-7 h-7 text-emerald-600" />
            <span>ตารางสต๊อกสินค้าหลัก (Excel Stock Ledger Matrix 1:1)</span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            โครงสร้างตารางอิงแบบฟอร์ม Excel หน้า <code className="bg-emerald-50 text-emerald-800 font-bold px-2 py-0.5 rounded font-mono text-xs">STOCK</code> (ยอดยกมา, รับเข้า, เบิกออก, ส่งตัวแทน, ขาย Shopee, ยอดคงเหลือ)
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
      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <p className="text-xs text-slate-500 font-semibold uppercase">จำนวนรายการสินค้าทั้งหมด</p>
            <p className="text-xl font-bold text-slate-900 mt-1">{summary.totalItems.toLocaleString()} รายการ</p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <p className="text-xs text-slate-500 font-semibold uppercase">ยอดรวมสต๊อกคงเหลือ</p>
            <p className="text-xl font-bold text-slate-900 mt-1">{summary.totalOnHand.toLocaleString()} ชิ้น</p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <p className="text-xs text-slate-500 font-semibold uppercase">มูลค่าสต็อกรวม</p>
            <p className="text-xl font-bold text-emerald-600 mt-1">฿{summary.totalValuation.toLocaleString('th-TH')}</p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 font-semibold uppercase">สถานะสต็อกเตือนภัย</p>
              <p className="text-sm font-bold text-slate-800 mt-1">
                <span className="text-amber-600">{summary.lowStockCount} ใกล้หมด</span> / <span className="text-rose-600">{summary.outOfStockCount} หมดสต็อก</span>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ค้นหา SKU, Barcode, ชื่อสินค้า..."
            className="w-full text-sm outline-none text-slate-800 placeholder-slate-400 font-mono"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={selectedWarehouse}
            onChange={(e) => setSelectedWarehouse(e.target.value)}
            className="text-xs border border-slate-300 rounded-lg px-3 py-2 bg-slate-50 outline-none font-medium"
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
            className="text-xs border border-slate-300 rounded-lg px-3 py-2 bg-slate-50 outline-none font-medium"
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
            className="text-xs border border-slate-300 rounded-lg px-3 py-2 bg-slate-50 outline-none font-medium"
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
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 text-slate-700 uppercase font-bold border-b border-slate-300">
              <tr>
                <th className="p-3">รหัสสินค้า (SKU)</th>
                <th className="p-3">รายการสินค้า (Description)</th>
                <th className="p-3 text-right bg-slate-200/50">ยอดยกมา</th>
                <th className="p-3 text-right text-emerald-700 bg-emerald-50">รับเข้า</th>
                <th className="p-3 text-right text-rose-700 bg-rose-50">เบิกออก</th>
                <th className="p-3 text-right text-blue-700 bg-blue-50">ตัวแทน</th>
                <th className="p-3 text-right text-purple-700 bg-purple-50">Shopee</th>
                <th className="p-3 text-right bg-amber-100/60 font-black text-slate-900">ยอดคงเหลือ</th>
                <th className="p-3 text-center">สถานะ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={9} className="text-center py-8 text-slate-400">
                    กำลังโหลดข้อมูลตารางสต๊อก Excel...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-8 text-slate-400">
                    ไม่พบรายการสินค้าในตาราง
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50 transition-all font-mono">
                    <td className="p-3 font-bold text-slate-900">{item.sku}</td>
                    <td className="p-3 font-sans">
                      <Link href={`/products/${item.productId}`} className="font-semibold text-slate-800 hover:text-emerald-600 hover:underline">
                        {item.productName}
                      </Link>
                      <p className="text-[11px] text-slate-400">{item.categoryName}</p>
                    </td>
                    <td className="p-3 text-right text-slate-600 bg-slate-50/50">{item.openingBalance}</td>
                    <td className="p-3 text-right font-semibold text-emerald-600 bg-emerald-50/30">+{item.stockIn}</td>
                    <td className="p-3 text-right font-semibold text-rose-600 bg-rose-50/30">-{item.stockOut}</td>
                    <td className="p-3 text-right font-semibold text-blue-600 bg-blue-50/30">-{item.dealerOut}</td>
                    <td className="p-3 text-right font-semibold text-purple-600 bg-purple-50/30">-{item.shopeeOut}</td>
                    <td className="p-3 text-right font-black text-slate-900 bg-amber-50 text-sm">
                      {item.onHand}
                    </td>
                    <td className="p-3 text-center font-sans">
                      <span
                        className={`px-2 py-0.5 rounded text-[11px] font-bold border ${
                          item.status === 'OUT_OF_STOCK'
                            ? 'bg-rose-100 text-rose-700 border-rose-200'
                            : item.status === 'LOW_STOCK'
                            ? 'bg-amber-100 text-amber-700 border-amber-200'
                            : item.status === 'OVER_STOCK'
                            ? 'bg-blue-100 text-blue-700 border-blue-200'
                            : 'bg-emerald-100 text-emerald-800 border-emerald-200'
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
