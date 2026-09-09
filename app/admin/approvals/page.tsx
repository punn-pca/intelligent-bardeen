'use client';

import React, { useState, useEffect } from 'react';
import { CheckSquare, ShieldCheck, Clock, CheckCircle2, XCircle } from 'lucide-react';

export default function ApprovalsPage() {
  const [approvals, setApprovals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadApprovals() {
    try {
      setLoading(true);
      const res = await fetch('/api/approvals');
      const data = await res.json();
      setApprovals(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadApprovals();
  }, []);

  const handleAction = async (id: string, status: 'APPROVED' | 'REJECTED') => {
    try {
      await fetch('/api/approvals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approvalId: id, status, approverId: 'usr-admin' }),
      });
      loadApprovals();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="border-b border-slate-200 pb-5">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <CheckSquare className="w-7 h-7 text-emerald-600" />
          <span>ศูนย์อนุมัติเอกสารและคำร้องระบบ (Approval Workflow Center)</span>
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          ผู้บริหารและหัวหน้างานอนุมัติคำร้อง PO, ปรับยอดสต๊อก (Adjustment), ส่วนลดพิเศษ และยกเลิกเอกสาร
        </p>
      </div>

      {/* Approvals Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 uppercase font-bold border-b border-slate-200">
              <tr>
                <th className="p-3">เลขที่เอกสาร</th>
                <th className="p-3">ประเภทคำร้อง</th>
                <th className="p-3">ผู้ยื่นคำร้อง</th>
                <th className="p-3">วันที่ยื่น</th>
                <th className="p-3 text-center">สถานะ</th>
                <th className="p-3 text-center">การอนุมัติ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-slate-400">
                    กำลังโหลดรายการรออนุมัติ...
                  </td>
                </tr>
              ) : approvals.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-slate-400">
                    ไม่มีรายการคำร้องรอการอนุมัติ
                  </td>
                </tr>
              ) : (
                approvals.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50">
                    <td className="p-3 font-bold text-slate-900">{item.document?.documentNo || item.documentId}</td>
                    <td className="p-3 font-sans font-semibold text-slate-800">{item.action}</td>
                    <td className="p-3 font-sans text-slate-600">{item.requester?.name || 'Staff'}</td>
                    <td className="p-3 text-slate-500">{new Date(item.createdAt).toLocaleDateString('th-TH')}</td>
                    <td className="p-3 text-center font-sans">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                          item.status === 'APPROVED'
                            ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
                            : item.status === 'REJECTED'
                            ? 'bg-rose-100 text-rose-700 border-rose-200'
                            : 'bg-amber-100 text-amber-700 border-amber-200'
                        }`}
                      >
                        {item.status}
                      </span>
                    </td>
                    <td className="p-3 text-center font-sans">
                      {item.status === 'PENDING' && (
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleAction(item.id, 'APPROVED')}
                            className="px-2.5 py-1 bg-emerald-600 text-white rounded text-[11px] font-bold hover:bg-emerald-700"
                          >
                            อนุมัติ
                          </button>
                          <button
                            onClick={() => handleAction(item.id, 'REJECTED')}
                            className="px-2.5 py-1 bg-rose-600 text-white rounded text-[11px] font-bold hover:bg-rose-700"
                          >
                            ปฏิเสธ
                          </button>
                        </div>
                      )}
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
