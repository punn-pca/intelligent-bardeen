'use client';

import React, { useState, useEffect } from 'react';
import { Landmark, Search, CircleDollarSign, CheckCircle2, Clock, PlusCircle } from 'lucide-react';
import Link from 'next/link';

export default function ARPage() {
  const [items, setItems] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  // Payment Modal
  const [selectedDoc, setSelectedDoc] = useState<any | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState('BANK_TRANSFER');
  const [payNotes, setPayNotes] = useState('');
  const [savingPay, setSavingPay] = useState(false);
  const [payMsg, setPayMsg] = useState('');

  async function loadAR() {
    try {
      setLoading(true);
      const res = await fetch(`/api/finance/ar?search=${encodeURIComponent(search)}`);
      const data = await res.json();
      setItems(data.data || []);
      setSummary(data.summary || null);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAR();
  }, [search]);

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDoc || !payAmount) return;

    try {
      setSavingPay(true);
      setPayMsg('');

      const res = await fetch('/api/finance/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentId: selectedDoc.id,
          amount: parseFloat(payAmount),
          paymentMethod: payMethod,
          notes: payNotes,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Payment failed');

      setPayMsg('บันทึกการรับชำระเงินเรียบร้อยแล้ว!');
      setSelectedDoc(null);
      setPayAmount('');
      setPayNotes('');
      await loadAR();
    } catch (err: any) {
      setPayMsg(err.message);
    } finally {
      setSavingPay(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="border-b border-slate-200 pb-5">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <Landmark className="w-7 h-7 text-blue-600" />
          <span>บัญชีลูกหนี้การค้า & การรับชำระเงิน (Accounts Receivable - AR Workbench)</span>
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          ระบบติดตามใบแจ้งหนี้ลูกหนี้การค้า รับชำระเงินเต็มจำนวน/ชำระบางส่วน (Partial Payment) และติดตามยอดคงค้าง
        </p>
      </div>

      {payMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 p-4 rounded-xl text-sm flex items-center gap-2 font-semibold">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{payMsg}</span>
        </div>
      )}

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <p className="text-xs text-slate-500 font-semibold uppercase">ยอดตั้งหนี้ทั้งหมด (Total AR)</p>
            <p className="text-xl font-bold text-slate-900 mt-1">฿{summary.totalAR.toLocaleString('th-TH')}</p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <p className="text-xs text-slate-500 font-semibold uppercase">รับชำระแล้ว (Total Paid)</p>
            <p className="text-xl font-bold text-emerald-600 mt-1">฿{summary.totalPaid.toLocaleString('th-TH')}</p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <p className="text-xs text-slate-500 font-semibold uppercase">ยอดค้างชำระสุทธิ (Outstanding)</p>
            <p className="text-xl font-bold text-rose-600 mt-1">฿{summary.totalOutstanding.toLocaleString('th-TH')}</p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <p className="text-xs text-slate-500 font-semibold uppercase">จำนวนบิลรอรับชำระ</p>
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
            placeholder="ค้นหาเลขที่บิล, ชื่อลูกค้า..."
            className="w-full text-sm outline-none font-mono text-slate-800"
          />
        </div>
      </div>

      {/* AR Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 uppercase font-bold border-b border-slate-200">
              <tr>
                <th className="p-3">เลขที่เอกสาร</th>
                <th className="p-3">ชื่อลูกค้า / สาขา</th>
                <th className="p-3 text-right">ยอดเงินรวม</th>
                <th className="p-3 text-right">ชำระแล้ว</th>
                <th className="p-3 text-right">ยอดคงค้าง</th>
                <th className="p-3 text-center">สถานะ</th>
                <th className="p-3 text-center">รับชำระเงิน</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-slate-400">
                    กำลังโหลดข้อมูลลูกหนี้การค้า...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-slate-400">
                    ไม่พบรายการลูกหนี้การค้า
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50">
                    <td className="p-3 font-bold text-blue-600">
                      <Link href={`/documents?search=${item.documentNo}`} className="hover:underline">
                        {item.documentNo}
                      </Link>
                    </td>
                    <td className="p-3 font-sans font-semibold text-slate-800">{item.customerName}</td>
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
                        {item.status === 'PAID' ? 'ชำระแล้ว' : item.status === 'PARTIAL' ? 'ชำระบางส่วน' : 'รอชำระ'}
                      </span>
                    </td>
                    <td className="p-3 text-center font-sans">
                      {item.dueAmount > 0 && (
                        <button
                          onClick={() => {
                            setSelectedDoc(item);
                            setPayAmount(item.dueAmount.toString());
                          }}
                          className="px-2.5 py-1 bg-emerald-600 text-white rounded text-[11px] font-bold hover:bg-emerald-700 flex items-center gap-1 mx-auto"
                        >
                          <PlusCircle className="w-3.5 h-3.5" />
                          <span>บันทึกรับเงิน</span>
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record Payment Modal */}
      {selectedDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md p-6 space-y-4 text-xs">
            <h3 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
              <CircleDollarSign className="w-5 h-5 text-emerald-600" />
              <span>บันทึกการรับชำระเงิน: [{selectedDoc.documentNo}]</span>
            </h3>

            <form onSubmit={handleRecordPayment} className="space-y-4">
              <div className="bg-slate-50 p-3 rounded-xl space-y-1">
                <p className="text-slate-500">ลูกค้า: <strong className="text-slate-900">{selectedDoc.customerName}</strong></p>
                <p className="text-slate-500">ยอดรวมบิล: <strong className="text-slate-900">฿{selectedDoc.grandTotal.toLocaleString('th-TH')}</strong></p>
                <p className="text-rose-600 font-bold">ยอดค้างชำระปัจจุบัน: ฿{selectedDoc.dueAmount.toLocaleString('th-TH')}</p>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">จำนวนเงินที่รับชำระ (บาท) *</label>
                <input
                  type="number"
                  step="0.01"
                  max={selectedDoc.dueAmount}
                  required
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none font-mono font-bold text-base text-emerald-600"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">* ระบุจำนวนเงินเต็ม หรือระบุเพื่อชำระบางส่วน (Partial)</span>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">ช่องทางชำระเงิน</label>
                <select
                  value={payMethod}
                  onChange={(e) => setPayMethod(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none font-semibold"
                >
                  <option value="BANK_TRANSFER">โอนเงินผ่านธนาคาร (Bank Transfer)</option>
                  <option value="CASH">เงินสด (Cash)</option>
                  <option value="CHEQUE">เช็คธนาคาร (Cheque)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">หมายเหตุ</label>
                <input
                  type="text"
                  value={payNotes}
                  onChange={(e) => setPayNotes(e.target.value)}
                  placeholder="เช่น สลิปโอนเงิน KBANK, อ้างอิงใบเสร็จ..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedDoc(null)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-slate-600 font-semibold"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={savingPay}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold shadow-xs"
                >
                  {savingPay ? 'กำลังบันทึก...' : 'ยืนยันรับชำระเงิน'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
