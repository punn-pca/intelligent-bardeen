'use client';

export const dynamic = 'force-dynamic';

import React, { useState, useEffect, Suspense } from 'react';
import { History, Search, Filter, Calendar } from 'lucide-react';
import { useSearchParams } from 'next/navigation';

function MovementsContent() {
  const [movements, setMovements] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [selectedWarehouse, setSelectedWarehouse] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(true);

  const searchParams = useSearchParams();
  const searchFromUrl = searchParams.get('search');

  useEffect(() => {
    if (searchFromUrl) {
      setSearch(searchFromUrl);
    }
  }, [searchFromUrl]);

  async function loadMovements() {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (selectedType) params.append('type', selectedType);
      if (selectedWarehouse) params.append('warehouseId', selectedWarehouse);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const [movRes, whRes] = await Promise.all([
        fetch(`/api/stock/movements?${params.toString()}`),
        fetch('/api/warehouses'),
      ]);

      const movData = await movRes.json();
      const whData = await whRes.json();

      setMovements(movData.data || []);
      setWarehouses(whData || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadMovements();
  }, [search, selectedType, selectedWarehouse, startDate, endDate]);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="border-b border-slate-200 pb-5">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <History className="w-7 h-7 text-purple-600" />
          <span>ประวัติการเคลื่อนไหวสินค้า (Stock Movement History)</span>
        </h1>
        <p className="text-sm text-slate-500 mt-1">ประวัติ Transaction ทั้งหมดแบบเรียงตามลำดับเวลา ตรวจสอบย้อนหลังได้ทุกรายการ</p>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1 min-w-[240px]">
            <Search className="w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ค้นหา Transaction ID, SKU, ชื่อสินค้า, Ref, เหตุผล..."
              className="w-full text-sm outline-none text-slate-800 placeholder-slate-400 font-mono"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="text-xs border border-slate-300 rounded-lg px-3 py-2 bg-slate-50 outline-none"
            >
              <option value="">ทุกประเภท Movement</option>
              <option value="STOCK_IN">STOCK_IN</option>
              <option value="STOCK_OUT">STOCK_OUT</option>
              <option value="TRANSFER_IN">TRANSFER_IN</option>
              <option value="TRANSFER_OUT">TRANSFER_OUT</option>
              <option value="ADJUSTMENT">ADJUSTMENT</option>
            </select>

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
          </div>
        </div>

        {/* Date Filter */}
        <div className="flex items-center gap-3 pt-2 border-t border-slate-100 text-xs text-slate-500">
          <Calendar className="w-4 h-4 text-slate-400" />
          <span>วันที่เริ่ม:</span>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="border border-slate-300 rounded px-2 py-1 bg-slate-50 outline-none"
          />
          <span>ถึง:</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="border border-slate-300 rounded px-2 py-1 bg-slate-50 outline-none"
          />
          {(startDate || endDate || search || selectedType || selectedWarehouse) && (
            <button
              onClick={() => {
                setSearch('');
                setSelectedType('');
                setSelectedWarehouse('');
                setStartDate('');
                setEndDate('');
              }}
              className="text-emerald-600 hover:underline font-semibold ml-2"
            >
              ล้าง Filter
            </button>
          )}
        </div>
      </div>

      {/* Movements Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500 uppercase text-xs border-b border-slate-200">
              <tr>
                <th className="p-4">Transaction ID</th>
                <th className="p-4">วัน-เวลา</th>
                <th className="p-4">Type</th>
                <th className="p-4">SKU / สินค้า</th>
                <th className="p-4">Warehouse</th>
                <th className="p-4 text-right">จำนวน</th>
                <th className="p-4 text-right">Before</th>
                <th className="p-4 text-right">After</th>
                <th className="p-4">ผู้ทำรายการ</th>
                <th className="p-4">เหตุผล / Ref</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={10} className="text-center py-8 text-slate-400">
                    กำลังโหลดประวัติ Stock Movements...
                  </td>
                </tr>
              ) : movements.length === 0 ? (
                <tr>
                  <td colSpan={10} className="text-center py-8 text-slate-400">
                    ไม่พบรายการเคลื่อนไหว
                  </td>
                </tr>
              ) : (
                movements.map((m) => {
                  const isPositive = m.quantity > 0;
                  const dateStr = new Date(m.createdAt).toLocaleString('th-TH', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  });

                  return (
                    <tr key={m.id} className="hover:bg-slate-50/80 transition-all">
                      <td className="p-4 font-mono font-semibold text-slate-900 text-xs">{m.transactionId}</td>
                      <td className="p-4 text-xs text-slate-500 whitespace-nowrap">{dateStr}</td>
                      <td className="p-4">
                        <span
                          className={`px-2 py-0.5 rounded text-xs font-semibold border ${
                            m.type === 'STOCK_IN'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : m.type === 'STOCK_OUT'
                              ? 'bg-rose-50 text-rose-600 border-rose-200'
                              : m.type.startsWith('TRANSFER')
                              ? 'bg-blue-50 text-blue-600 border-blue-200'
                              : 'bg-amber-50 text-amber-600 border-amber-200'
                          }`}
                        >
                          {m.type}
                        </span>
                      </td>
                      <td className="p-4">
                        <p className="font-semibold text-slate-800 text-xs">{m.product.name}</p>
                        <p className="font-mono text-[11px] text-slate-500">{m.product.sku}</p>
                      </td>
                      <td className="p-4 font-mono text-xs font-bold text-slate-700">{m.warehouse.code}</td>
                      <td
                        className={`p-4 text-right font-mono font-bold ${
                          isPositive ? 'text-emerald-600' : 'text-rose-600'
                        }`}
                      >
                        {isPositive ? `+${m.quantity}` : m.quantity}
                      </td>
                      <td className="p-4 text-right font-mono text-slate-500 text-xs">{m.beforeOnHand}</td>
                      <td className="p-4 text-right font-mono font-bold text-slate-800 text-xs">{m.afterOnHand}</td>
                      <td className="p-4 text-xs text-slate-700 font-medium">{m.createdBy?.name}</td>
                      <td className="p-4 text-xs text-slate-600">
                        {m.reason && <p className="font-medium text-slate-800">{m.reason}</p>}
                        {m.reference && <p className="font-mono text-slate-400">Ref: {m.reference}</p>}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default function StockMovementsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-400">กำลังโหลด...</div>}>
      <MovementsContent />
    </Suspense>
  );
}
