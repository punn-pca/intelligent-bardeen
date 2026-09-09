'use client';

import React, { useState, useEffect } from 'react';
import { Receipt, Search, Truck } from 'lucide-react';
import Link from 'next/link';

export default function APPage() {
  const [items, setItems] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadAP() {
      try {
        setLoading(true);
        const res = await fetch(`/api/finance/ap?search=${encodeURIComponent(search)}`);
        const data = await res.json();
        setItems(data.data || []);
        setSummary(data.summary || null);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    loadAP();
  }, [search]);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="border-b border-slate-200 pb-5">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <Receipt className="w-7 h-7 text-purple-600" />
          <span>บัญชีเจ้าหนี้การค้า & การจ่ายเงิน (Accounts Payable - AP)</span>
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          ระบบติดตามใบบิลจัดซื้อ/ใบสั่งซื้อซัพพลายเออร์ ยอดจ่ายเงิน และเจ้าหนี้ค้างชำระ (Supplier Payable Outstanding)
        </p>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <p className="text-xs text-slate-500 font-semibold uppercase">ยอดเจ้าหนี้ตั้งค้างทั้งหมด (Total AP)</p>
            <p className="text-xl font-bold text-slate-900 mt-1">฿{summary.totalAP.toLocaleString('th-TH')}</p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <p className="text-xs text-slate-500 font-semibold uppercase">จ่ายเงินแล้ว (Total Paid)</p>
            <p className="text-xl font-bold text-emerald-600 mt-1">฿{summary.totalPaid.toLocaleString('th-TH')}</p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <p className="text-xs text-slate-500 font-semibold uppercase">ยอดค้างจ่ายซัพพลายเออร์</p>
            <p className="text-xl font-bold text-rose-600 mt-1">฿{summary.totalOutstanding.toLocaleString('th-TH')}</p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <p className="text-xs text-slate-500 font-semibold uppercase">จำนวนบิลค้างจ่าย</p>
            <p className="text-xl font-bold text-amber-600 mt-1">{summary.unpaidCount} บิล</p>
          </div>
        </div>
      )}

      {/* Filter */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
        <div className="flex items-center gap-3 flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ค้นหาเลขที่ PO, ชื่อซัพพลายเออร์..."
            className="w-full text-sm outline-none font-mono text-slate-800"
          />
        </div>
      </div>

      {/* AP Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 uppercase font-bold border-b border-slate-200">
              <tr>
                <th className="p-3">เลขที่เอกสาร PO</th>
                <th className="p-3">ชื่อซัพพลายเออร์</th>
                <th className="p-3">วันที่เอกสาร</th>
                <th className="p-3 text-right">ยอดสั่งซื้อรวม</th>
                <th className="p-3 text-right">จ่ายแล้ว</th>
                <th className="p-3 text-right">คงค้างจ่าย</th>
                <th className="p-3 text-center">สถานะ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-slate-400">
                    กำลังโหลดข้อมูลเจ้าหนี้การค้า...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-slate-400">
                    ไม่พบรายการเจ้าหนี้การค้า
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50">
                    <td className="p-3 font-bold text-purple-600">
                      <Link href={`/documents?search=${item.documentNo}`} className="hover:underline">
                        {item.documentNo}
                      </Link>
                    </td>
                    <td className="p-3 font-sans font-semibold text-slate-800">{item.supplierName}</td>
                    <td className="p-3 text-slate-500">{new Date(item.issueDate).toLocaleDateString('th-TH')}</td>
                    <td className="p-3 text-right font-bold text-slate-900">฿{item.grandTotal.toLocaleString('th-TH')}</td>
                    <td className="p-3 text-right text-emerald-600">฿{item.paidAmount.toLocaleString('th-TH')}</td>
                    <td className="p-3 text-right font-bold text-rose-600">฿{item.dueAmount.toLocaleString('th-TH')}</td>
                    <td className="p-3 text-center font-sans">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                          item.status === 'PAID'
                            ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
                            : item.status === 'PARTIAL'
                            ? 'bg-amber-100 text-amber-700 border-amber-200'
                            : 'bg-rose-100 text-rose-700 border-rose-200'
                        }`}
                      >
                        {item.status === 'PAID' ? 'จ่ายครบแล้ว' : item.status === 'PARTIAL' ? 'จ่ายบางส่วน' : 'ค้างจ่าย'}
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
