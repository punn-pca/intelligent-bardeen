'use client';

import React, { useState, useEffect } from 'react';
import { CheckCircle2, AlertTriangle, ShieldCheck, RefreshCw, Wrench } from 'lucide-react';
import { useRole } from '@/components/context/RoleContext';

export default function IntegrityPage() {
  const { currentRole } = useRole();
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [reconciling, setReconciling] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const isAdminOrManager = currentRole === 'ADMIN' || currentRole === 'MANAGER';

  async function runIntegrityCheck() {
    try {
      setLoading(true);
      setErrorMsg('');
      const res = await fetch('/api/stock/integrity', {
        headers: { 'x-user-role': currentRole || 'ADMIN' },
      });
      const data = await res.json();
      setResult(data);
    } catch (e: any) {
      console.error(e);
      setErrorMsg(e.message || 'Failed to verify stock integrity');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    runIntegrityCheck();
  }, [currentRole]);

  const handleReconcile = async () => {
    try {
      setReconciling(true);
      setErrorMsg('');
      setSuccessMsg('');

      const res = await fetch('/api/stock/integrity/reconcile', {
        method: 'POST',
        headers: { 'x-user-role': currentRole || 'ADMIN' },
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to reconcile stock');

      setSuccessMsg(data.message || 'ปรับปรุงยอดสต็อกที่คลาดเคลื่อนเรียบร้อยแล้ว');
      await runIntegrityCheck();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setReconciling(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <ShieldCheck className="w-7 h-7 text-emerald-600" />
            <span>ตรวจสอบความถูกต้องของสต็อก (Data Consistency Check)</span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            คำนวณยอดรวมของ Stock Movements ทั้งหมด (+Stock In, -Stock Out, ±Transfer, ±Adjustment) เปรียบเทียบกับ <code className="bg-slate-100 text-slate-800 px-2 py-0.5 rounded font-mono text-xs">inventory.on_hand</code> ในฐานข้อมูล
          </p>
        </div>

        <button
          onClick={runIntegrityCheck}
          disabled={loading || reconciling}
          className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold flex items-center gap-2 shadow-xs transition-all disabled:opacity-50 shrink-0"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span>รันการตรวจสอบอีกครั้ง</span>
        </button>
      </div>

      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 p-4 rounded-xl text-sm flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600" />
          <span className="font-semibold">{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 p-4 rounded-xl text-sm flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 shrink-0 text-rose-600" />
          <span className="font-semibold">{errorMsg}</span>
        </div>
      )}

      {loading ? (
        <div className="bg-white p-12 rounded-xl border border-slate-200 shadow-xs text-center text-slate-400">
          <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin mx-auto mb-3" />
          <p className="font-medium text-slate-700">กำลังตรวจสอบความถูกต้องของระบบสต็อกทั้งหมด...</p>
        </div>
      ) : result && result.isValid ? (
        <div className="bg-emerald-50 border-2 border-emerald-200 p-8 rounded-xl text-center space-y-3">
          <div className="w-16 h-16 bg-emerald-500 text-white rounded-full flex items-center justify-center mx-auto shadow-md shadow-emerald-500/20">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <h2 className="text-2xl font-bold text-emerald-900">ALL STOCKS INTEGRITY VERIFIED</h2>
          <p className="text-sm text-emerald-700 max-w-lg mx-auto">
            ตรวจสอบครบถ้วน {result.totalAudited} รายการในคลังสินค้า ยอดรวมใน Stock Movements สอดคล้องกับ On Hand ปัจจุบัน 100% ไม่พบข้อผิดพลาด
          </p>
        </div>
      ) : (
        <div className="bg-rose-50 border-2 border-rose-200 p-8 rounded-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-rose-200 pb-4">
            <div className="flex items-center gap-3 text-rose-700">
              <AlertTriangle className="w-8 h-8 shrink-0" />
              <div>
                <h2 className="text-xl font-bold">STOCK INTEGRITY ERROR</h2>
                <p className="text-sm">พบข้อผิดพลาดความไม่สอดคล้องระหว่าง Stock Movements และ inventory.on_hand จำนวน {result?.discrepanciesCount} รายการ</p>
              </div>
            </div>

            {isAdminOrManager && (
              <button
                onClick={handleReconcile}
                disabled={reconciling}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-sm font-bold flex items-center gap-2 shadow-sm transition-all disabled:opacity-50 shrink-0"
              >
                <Wrench className={`w-4 h-4 ${reconciling ? 'animate-spin' : ''}`} />
                <span>{reconciling ? 'กำลังปรับปรุง...' : '⚡ ปรับปรุงยอดยกมาเริ่มต้นให้อัตโนมัติ (Auto-Reconcile)'}</span>
              </button>
            )}
          </div>

          <div className="bg-white rounded-lg border border-rose-200 overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-rose-100/50 text-rose-900 uppercase text-xs">
                <tr>
                  <th className="p-3">SKU</th>
                  <th className="p-3">สินค้า</th>
                  <th className="p-3">คลัง</th>
                  <th className="p-3 text-right">On Hand ใน DB</th>
                  <th className="p-3 text-right">คำนวณจาก Movements</th>
                  <th className="p-3 text-right">ส่วนต่าง (Diff)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-rose-100">
                {result?.discrepancies?.map((item: any, idx: number) => (
                  <tr key={idx} className="font-mono text-xs text-rose-900">
                    <td className="p-3 font-bold">{item.productSku}</td>
                    <td className="p-3 font-sans">{item.productName}</td>
                    <td className="p-3 font-bold">{item.warehouseCode}</td>
                    <td className="p-3 text-right font-bold">{item.currentOnHand}</td>
                    <td className="p-3 text-right">{item.calculatedOnHand}</td>
                    <td className="p-3 text-right font-bold text-rose-600">{item.diff}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
