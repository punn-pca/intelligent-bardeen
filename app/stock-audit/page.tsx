'use client';

import React, { useState, useEffect } from 'react';
import { ClipboardList, Plus, Search, Building2, Calendar, CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { useRole } from '@/components/context/RoleContext';

export default function StockAuditListPage() {
  const { currentRole } = useRole();
  const [audits, setAudits] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const [selectedWarehouseId, setSelectedWarehouseId] = useState('');
  const [notes, setNotes] = useState('');
  const [creating, setCreating] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  async function loadData() {
    try {
      setLoading(true);
      const [auditRes, whRes] = await Promise.all([
        fetch('/api/stock-audits'),
        fetch('/api/warehouses'),
      ]);

      const auditData = await auditRes.json();
      const whData = await whRes.json();

      setAudits(auditData || []);
      setWarehouses(whData || []);
      if (whData && whData.length > 0) setSelectedWarehouseId(whData[0].id);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateAudit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    try {
      setCreating(true);
      const res = await fetch('/api/stock-audits', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': currentRole || 'ADMIN',
        },
        body: JSON.stringify({
          warehouseId: selectedWarehouseId,
          notes,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create stock audit session');

      setShowModal(false);
      setNotes('');
      await loadData();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <ClipboardList className="w-7 h-7 text-indigo-600" />
            <span>โปรแกรมนับสต็อกสินค้าจริง (Physical Stock Count & Audit)</span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            เปิดรอบตรวจนับสินค้าคงเหลือในคลัง สแกนบาร์โค้ด ตรวจจับผลต่าง (Variance) และกระทบยอดสต็อกอัตโนมัติ
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold flex items-center gap-2 shadow-xs transition-all shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>+ เปิดรอบนับสต็อกใหม่ (New Count Session)</span>
        </button>
      </div>

      {/* Audit Sessions Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500 uppercase text-xs border-b border-slate-200">
            <tr>
              <th className="p-4">เลขที่รอบนับ (Audit No)</th>
              <th className="p-4">คลังสินค้า</th>
              <th className="p-4">สถานะ</th>
              <th className="p-4">จำนวนรายการสินค้า</th>
              <th className="p-4">วันที่เริ่มนับ</th>
              <th className="p-4">ผู้เปิดรอบ</th>
              <th className="p-4 text-center">เข้าสู่นำนับ / จัดการ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan={7} className="text-center py-8 text-slate-400">
                  กำลังโหลดรายการรอบนับสต็อก...
                </td>
              </tr>
            ) : audits.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-8 text-slate-400">
                  ยังไม่มีรอบการนับสต็อกในระบบ
                </td>
              </tr>
            ) : (
              audits.map((a) => {
                const dateStr = new Date(a.startedAt).toLocaleString('th-TH');

                return (
                  <tr key={a.id} className="hover:bg-slate-50/80 transition-all">
                    <td className="p-4 font-mono font-bold text-indigo-600 text-xs">{a.auditNo}</td>
                    <td className="p-4 font-semibold text-slate-800 text-xs">
                      {a.warehouse.code} - {a.warehouse.name}
                    </td>
                    <td className="p-4">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                          a.status === 'COMPLETED'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : a.status === 'CANCELLED'
                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : 'bg-amber-50 text-amber-700 border-amber-200 animate-pulse'
                        }`}
                      >
                        {a.status === 'IN_PROGRESS' ? 'กำลังตรวจนับ (In Progress)' : a.status}
                      </span>
                    </td>
                    <td className="p-4 text-xs font-mono font-semibold text-slate-700">
                      {a._count?.items || 0} รายการ
                    </td>
                    <td className="p-4 text-xs text-slate-500">{dateStr}</td>
                    <td className="p-4 text-xs text-slate-700 font-medium">{a.createdBy?.name || '-'}</td>
                    <td className="p-4 text-center">
                      <Link
                        href={`/stock-audit/${a.id}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-semibold transition-all border border-indigo-200"
                      >
                        <span>เข้าสู่นำนับสินค้า</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* New Audit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-md p-6 space-y-4">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-indigo-600" />
              <span>เปิดรอบนับสต็อกใหม่</span>
            </h3>

            {errorMsg && (
              <div className="bg-rose-50 border border-rose-200 text-rose-700 p-3 rounded text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleCreateAudit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">เลือกคลังสินค้าที่ต้องการตรวจนับ *</label>
                <select
                  value={selectedWarehouseId}
                  onChange={(e) => setSelectedWarehouseId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:border-indigo-500 font-semibold"
                >
                  {warehouses.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.code} - {w.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">หมายเหตุรอบการนับ</label>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="เช่น ตรวจนับสินค้าประจำสิ้นเดือน หรือตรวจนับคลังหลัก..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-slate-600 font-semibold"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold flex items-center gap-1 shadow-xs"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{creating ? 'กำลังสร้าง...' : 'เริ่มรอบนับสต็อก'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
