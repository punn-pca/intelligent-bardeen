'use client';

import React, { useState, useEffect } from 'react';
import { FileBarChart, Download, Filter, CircleDollarSign, AlertTriangle, Boxes } from 'lucide-react';

export default function ReportsPage() {
  const [reportData, setReportData] = useState<any>(null);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [reportType, setReportType] = useState('valuation');
  const [selectedWarehouse, setSelectedWarehouse] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [loading, setLoading] = useState(true);

  async function loadReport() {
    try {
      setLoading(true);
      const params = new URLSearchParams({ type: reportType });
      if (selectedWarehouse) params.append('warehouseId', selectedWarehouse);
      if (selectedCategory) params.append('categoryId', selectedCategory);

      const [repRes, whRes, catRes] = await Promise.all([
        fetch(`/api/reports?${params.toString()}`),
        fetch('/api/warehouses'),
        fetch('/api/categories'),
      ]);

      const repData = await repRes.json();
      const whData = await whRes.json();
      const catData = await catRes.json();

      setReportData(repData);
      setWarehouses(whData || []);
      setCategories(catData || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadReport();
  }, [reportType, selectedWarehouse, selectedCategory]);

  const handleExportCSV = () => {
    const params = new URLSearchParams({ type: reportType, export: 'csv' });
    if (selectedWarehouse) params.append('warehouseId', selectedWarehouse);
    if (selectedCategory) params.append('categoryId', selectedCategory);

    window.open(`/api/reports?${params.toString()}`, '_blank');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <FileBarChart className="w-7 h-7 text-emerald-600" />
            <span>รายงานสรุปสต็อกสินค้า (Inventory Reports)</span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">รายงานสรุปมูลค่าสต็อก สินค้าใกล้หมด สต็อกแยกตามคลัง และการส่งออกข้อมูลเป็น CSV / Excel</p>
        </div>

        <button
          onClick={handleExportCSV}
          className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold flex items-center gap-2 shadow-xs transition-all"
        >
          <Download className="w-4 h-4" />
          <span>Export เป็น CSV</span>
        </button>
      </div>

      {/* Report Type Tabs */}
      <div className="flex flex-wrap items-center gap-2 bg-slate-100 p-1.5 rounded-xl border border-slate-200">
        {[
          { id: 'valuation', label: '1. Inventory Valuation (มูลค่าสต็อก)' },
          { id: 'current', label: '2. Current Stock Report (สต็อกปัจจุบัน)' },
          { id: 'low_stock', label: '3. Low Stock Report (สินค้าใกล้หมด)' },
          { id: 'warehouse', label: '4. Warehouse Stock (สต็อกแยกคลัง)' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setReportType(tab.id)}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              reportType === tab.id
                ? 'bg-white text-emerald-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-4">
        <Filter className="w-4 h-4 text-slate-400" />
        <select
          value={selectedWarehouse}
          onChange={(e) => setSelectedWarehouse(e.target.value)}
          className="text-xs border border-slate-300 rounded-lg px-3 py-2 bg-slate-50 outline-none"
        >
          <option value="">ทุกคลังสินค้า</option>
          {warehouses.map((w) => (
            <option key={w.id} value={w.id}>
              {w.code} - {w.name}
            </option>
          ))}
        </select>

        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="text-xs border border-slate-300 rounded-lg px-3 py-2 bg-slate-50 outline-none"
        >
          <option value="">ทุกหมวดหมู่</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {/* Summary Banner */}
      {reportData && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <p className="text-xs text-slate-500 font-semibold uppercase">จำนวนรายการในรายงาน</p>
            <p className="text-xl font-bold text-slate-900 mt-1">{reportData.totalItems} รายการ</p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <p className="text-xs text-slate-500 font-semibold uppercase">จำนวนชิ้นรวม (On Hand)</p>
            <p className="text-xl font-bold text-slate-900 mt-1">{reportData.totalOnHand} ชิ้น</p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <p className="text-xs text-slate-500 font-semibold uppercase">มูลค่าสต็อกรวม</p>
            <p className="text-xl font-bold text-emerald-600 mt-1">
              ฿{reportData.totalValuation.toLocaleString('th-TH')}
            </p>
          </div>
        </div>
      )}

      {/* Report Results Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500 uppercase text-xs border-b border-slate-200">
              <tr>
                <th className="p-4">SKU</th>
                <th className="p-4">Barcode</th>
                <th className="p-4">สินค้า</th>
                <th className="p-4">หมวดหมู่</th>
                <th className="p-4">คลัง</th>
                <th className="p-4 text-right">On Hand</th>
                <th className="p-4 text-right">Available</th>
                <th className="p-4 text-right">ทุน/หน่วย</th>
                <th className="p-4 text-right">มูลค่ารวม</th>
                <th className="p-4">สถานะ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={10} className="text-center py-8 text-slate-400">
                    กำลังสร้างรายงาน...
                  </td>
                </tr>
              ) : !reportData || reportData.rows.length === 0 ? (
                <tr>
                  <td colSpan={10} className="text-center py-8 text-slate-400">
                    ไม่พบข้อมูลสำหรับรายงานนี้
                  </td>
                </tr>
              ) : (
                reportData.rows.map((row: any, idx: number) => (
                  <tr key={idx} className="hover:bg-slate-50/80 transition-all">
                    <td className="p-4 font-mono font-semibold text-slate-900">{row.sku}</td>
                    <td className="p-4 font-mono text-slate-500 text-xs">{row.barcode}</td>
                    <td className="p-4 font-medium text-slate-800">{row.productName}</td>
                    <td className="p-4 text-slate-600 text-xs">{row.category}</td>
                    <td className="p-4 font-mono text-xs font-semibold text-slate-700">{row.warehouseCode}</td>
                    <td className="p-4 text-right font-bold text-slate-900">{row.onHand}</td>
                    <td className="p-4 text-right text-emerald-600 font-semibold">{row.available}</td>
                    <td className="p-4 text-right font-mono text-slate-600">฿{row.costPrice.toLocaleString('th-TH')}</td>
                    <td className="p-4 text-right font-mono font-bold text-emerald-700">
                      ฿{row.totalValuation.toLocaleString('th-TH')}
                    </td>
                    <td className="p-4">
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-semibold border ${
                          row.status === 'OUT_OF_STOCK'
                            ? 'bg-rose-50 text-rose-600 border-rose-200'
                            : row.status === 'LOW_STOCK'
                            ? 'bg-amber-50 text-amber-600 border-amber-200'
                            : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        }`}
                      >
                        {row.status}
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
