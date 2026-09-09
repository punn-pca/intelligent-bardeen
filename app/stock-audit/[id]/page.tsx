'use client';

import React, { useState, useEffect } from 'react';
import { ClipboardList, QrCode, Search, CheckCircle2, AlertTriangle, ArrowLeft, RefreshCw, Layers } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useRole } from '@/components/context/RoleContext';

export default function StockAuditWorkstationPage({ params }: { params: { id: string } }) {
  const { currentRole } = useRole();
  const router = useRouter();

  const [audit, setAudit] = useState<any | null>(null);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterVarianceOnly, setFilterVarianceOnly] = useState(false);

  // Fast Barcode Scanner input
  const [barcodeInput, setBarcodeInput] = useState('');
  const [scanStatusMsg, setScanStatusMsg] = useState('');

  const [reconciling, setReconciling] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  async function loadAuditDetails() {
    try {
      setLoading(true);
      const res = await fetch(`/api/stock-audits/${params.id}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load audit session');

      setAudit(data);
      setItems(data.items || []);
    } catch (e: any) {
      setErrorMsg(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAuditDetails();
  }, [params.id]);

  const handleCountChange = async (productId: string, countedQty: number) => {
    try {
      // Optimistic UI update
      setItems((prev) =>
        prev.map((i) => {
          if (i.productId === productId) {
            const count = Math.max(0, countedQty);
            const varQty = count - i.systemQty;
            const varVal = varQty * i.unitCost;
            return { ...i, countedQty: count, varianceQty: varQty, varianceValue: varVal };
          }
          return i;
        })
      );

      await fetch(`/api/stock-audits/${params.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': currentRole || 'ADMIN',
        },
        body: JSON.stringify({ productId, countedQty }),
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!barcodeInput.trim()) return;

    const term = barcodeInput.trim().toLowerCase();
    const matchedItem = items.find(
      (i) => i.product.barcode.toLowerCase() === term || i.product.sku.toLowerCase() === term
    );

    if (matchedItem) {
      const newCount = matchedItem.countedQty + 1;
      handleCountChange(matchedItem.productId, newCount);
      setScanStatusMsg(`✅ สแกนสำเร็จ: ${matchedItem.product.sku} - ${matchedItem.product.name} (นับรวม = ${newCount})`);
    } else {
      setScanStatusMsg(`❌ ไม่พบบาร์โค้ด / SKU: ${barcodeInput}`);
    }

    setBarcodeInput('');
    setTimeout(() => setScanStatusMsg(''), 4000);
  };

  const handleReconcile = async () => {
    if (!confirm('ยืนยันการกระทบยอดสต็อกและปิดรอบนับ? สต็อกคงเหลือในคลังจะถูกปรับเปลี่ยนตามผลการนับจริงทันที')) return;

    try {
      setReconciling(true);
      setErrorMsg('');

      const res = await fetch(`/api/stock-audits/${params.id}/reconcile`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': currentRole || 'ADMIN',
        },
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to reconcile audit session');

      alert(data.message);
      await loadAuditDetails();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setReconciling(false);
    }
  };

  // Calculations
  const filteredItems = items.filter((item) => {
    const matchesSearch =
      item.product.sku.toLowerCase().includes(search.toLowerCase()) ||
      item.product.name.toLowerCase().includes(search.toLowerCase()) ||
      item.product.barcode.toLowerCase().includes(search.toLowerCase());

    const matchesVariance = filterVarianceOnly ? item.varianceQty !== 0 : true;

    return matchesSearch && matchesVariance;
  });

  const totalSystemQty = items.reduce((acc, curr) => acc + curr.systemQty, 0);
  const totalCountedQty = items.reduce((acc, curr) => acc + curr.countedQty, 0);
  const totalVarianceQty = items.reduce((acc, curr) => acc + curr.varianceQty, 0);
  const totalVarianceValue = items.reduce((acc, curr) => acc + curr.varianceValue, 0);

  if (loading) {
    return (
      <div className="p-12 text-center text-slate-400 font-medium">
        กำลังโหลดข้อมูลหน้าจอนับสต็อก...
      </div>
    );
  }

  if (!audit) {
    return (
      <div className="p-6 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-sm">
        {errorMsg || 'ไม่พบรอบการนับสต็อกนี้'}
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Header Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <Link
            href="/stock-audit"
            className="text-xs text-indigo-600 font-semibold hover:underline flex items-center gap-1 mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>กลับไปรายการรอบนับสต็อก</span>
          </Link>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <ClipboardList className="w-7 h-7 text-indigo-600" />
            <span>รอบนับสต็อก: {audit.auditNo}</span>
            <span
              className={`text-xs px-3 py-1 rounded-full font-bold border ${
                audit.status === 'COMPLETED'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-amber-50 text-amber-700 border-amber-200'
              }`}
            >
              {audit.status}
            </span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            คลัง: <strong>{audit.warehouse.code} - {audit.warehouse.name}</strong> | เริ่มเมื่อ:{' '}
            {new Date(audit.startedAt).toLocaleString('th-TH')}
          </p>
        </div>

        {audit.status === 'IN_PROGRESS' && (
          <button
            onClick={handleReconcile}
            disabled={reconciling}
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm flex items-center gap-2 shadow-md shadow-emerald-600/30 transition-all shrink-0"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{reconciling ? 'กำลังกระทบยอด...' : 'กระทบยอด & ปรับสต็อกเข้าคลัง (Reconcile)'}</span>
          </button>
        )}
      </div>

      {errorMsg && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 p-3.5 rounded-lg text-sm flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Barcode Scanner Input Bar */}
      {audit.status === 'IN_PROGRESS' && (
        <div className="bg-slate-900 text-white p-4 rounded-2xl shadow-md space-y-2">
          <form onSubmit={handleBarcodeSubmit} className="flex items-center gap-3">
            <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center shrink-0">
              <QrCode className="w-5 h-5 text-white" />
            </div>
            <input
              type="text"
              value={barcodeInput}
              onChange={(e) => setBarcodeInput(e.target.value)}
              placeholder="สแกนบาร์โค้ดสินค้า หรือพิมพ์ SKU ที่นี่เพื่อเพิ่มจำนวนนับ (+1)..."
              className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-400 outline-none focus:border-indigo-500 font-mono"
              autoFocus
            />
            <button
              type="submit"
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all"
            >
              นับบาร์โค้ด
            </button>
          </form>

          {scanStatusMsg && (
            <p className="text-xs font-bold text-emerald-400 pl-12 animate-in fade-in duration-150">
              {scanStatusMsg}
            </p>
          )}
        </div>
      )}

      {/* Summary Variance Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <p className="text-xs font-semibold text-slate-500">สต็อกในระบบรวม (System)</p>
          <p className="text-xl font-bold font-mono text-slate-900 mt-1">{totalSystemQty.toLocaleString()} ชิ้น</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <p className="text-xs font-semibold text-slate-500">นับได้จริงรวม (Counted)</p>
          <p className="text-xl font-bold font-mono text-indigo-600 mt-1">{totalCountedQty.toLocaleString()} ชิ้น</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <p className="text-xs font-semibold text-slate-500">ผลต่างรวม (Variance Qty)</p>
          <p
            className={`text-xl font-bold font-mono mt-1 ${
              totalVarianceQty < 0
                ? 'text-rose-600'
                : totalVarianceQty > 0
                ? 'text-emerald-600'
                : 'text-slate-900'
            }`}
          >
            {totalVarianceQty > 0 ? `+${totalVarianceQty.toLocaleString()}` : totalVarianceQty.toLocaleString()} ชิ้น
          </p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <p className="text-xs font-semibold text-slate-500">มูลค่าผลต่างรวม (Variance Value)</p>
          <p
            className={`text-xl font-bold font-mono mt-1 ${
              totalVarianceValue < 0 ? 'text-rose-600' : 'text-emerald-600'
            }`}
          >
            ฿{totalVarianceValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ค้นหา SKU, บาร์โค้ด, หรือชื่อสินค้าในตารางนับสต็อก..."
            className="w-full text-xs outline-none text-slate-800 font-mono placeholder-slate-400"
          />
        </div>

        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
            <input
              type="checkbox"
              checked={filterVarianceOnly}
              onChange={(e) => setFilterVarianceOnly(e.target.checked)}
              className="rounded text-indigo-600"
            />
            <span>แสดงเฉพาะรายการที่มีผลต่าง (Variance ≠ 0)</span>
          </label>
        </div>
      </div>

      {/* Items Count Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500 uppercase text-xs border-b border-slate-200">
              <tr>
                <th className="p-4">SKU / บาร์โค้ด</th>
                <th className="p-4">รายการสินค้า</th>
                <th className="p-4 text-right">สต็อกในระบบ</th>
                <th className="p-4 text-right w-36">จำนวนนับได้จริง *</th>
                <th className="p-4 text-right">ผลต่าง (Variance)</th>
                <th className="p-4 text-right">ต้นทุน/หน่วย</th>
                <th className="p-4 text-right">มูลค่าผลต่าง</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-slate-400">
                    ไม่พบรายการสินค้าที่ค้นหา
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => {
                  const isVar = item.varianceQty !== 0;

                  return (
                    <tr
                      key={item.id}
                      className={`hover:bg-slate-50/80 transition-all ${
                        isVar ? 'bg-amber-50/40' : ''
                      }`}
                    >
                      <td className="p-4 font-mono font-bold text-slate-900 text-xs">
                        <p>{item.product.sku}</p>
                        <p className="text-[10px] text-slate-400">{item.product.barcode}</p>
                      </td>
                      <td className="p-4 font-semibold text-slate-800 text-xs">{item.product.name}</td>
                      <td className="p-4 text-right font-mono text-xs text-slate-600">
                        {item.systemQty.toLocaleString()} {item.product.unit}
                      </td>
                      <td className="p-4 text-right">
                        {audit.status === 'IN_PROGRESS' ? (
                          <input
                            type="number"
                            min="0"
                            value={item.countedQty}
                            onChange={(e) => handleCountChange(item.productId, parseInt(e.target.value) || 0)}
                            className="w-24 px-2.5 py-1.5 border border-slate-300 rounded-lg text-right font-mono font-bold text-xs text-indigo-600 bg-white outline-none focus:border-indigo-500 shadow-2xs"
                          />
                        ) : (
                          <span className="font-mono font-bold text-xs text-indigo-600">
                            {item.countedQty.toLocaleString()} {item.product.unit}
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-right font-mono font-bold text-xs">
                        <span
                          className={`px-2 py-0.5 rounded ${
                            item.varianceQty < 0
                              ? 'bg-rose-100 text-rose-700'
                              : item.varianceQty > 0
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'text-slate-400'
                          }`}
                        >
                          {item.varianceQty > 0 ? `+${item.varianceQty}` : item.varianceQty}
                        </span>
                      </td>
                      <td className="p-4 text-right font-mono text-xs text-slate-500">
                        ฿{item.unitCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td
                        className={`p-4 text-right font-mono font-bold text-xs ${
                          item.varianceValue < 0 ? 'text-rose-600' : item.varianceValue > 0 ? 'text-emerald-600' : 'text-slate-400'
                        }`}
                      >
                        ฿{item.varianceValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
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
