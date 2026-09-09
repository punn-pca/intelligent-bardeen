'use client';

import React, { useState, useEffect } from 'react';
import { CircleDollarSign, FileText, Download, Building2 } from 'lucide-react';

export default function TaxPage() {
  const [taxData, setTaxData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadTax() {
      try {
        setLoading(true);
        const res = await fetch('/api/finance/tax');
        const data = await res.json();
        setTaxData(data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    loadTax();
  }, []);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="border-b border-slate-200 pb-5">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <CircleDollarSign className="w-7 h-7 text-emerald-600" />
          <span>ศูนย์รายงานภาษีมูลค่าเพิ่ม & ภาษีหัก ณ ที่จ่าย (VAT 7% & WHT 3% Center)</span>
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          คำนวณภาษีขาย (Output VAT), ภาษีซื้อ (Input VAT), และยอดภาษีนำส่งสรรพากรของ **บริษัท เอส แอนด์ บี อีเล็คโทรนิคส์ เซอร์วิส จำกัด**
        </p>
      </div>

      {/* Tax Info Card */}
      <div className="bg-slate-900 text-white p-5 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <span className="text-xs text-blue-400 font-bold uppercase tracking-wider">ข้อมูลผู้เสียภาษี (S&B Corporate Tax Profile)</span>
          <h2 className="text-lg font-bold mt-1">บริษัท เอส แอนด์ บี อีเล็คโทรนิคส์ เซอร์วิส จำกัด</h2>
          <p className="text-xs text-slate-400 mt-1 font-mono">เลขประจำตัวผู้เสียภาษี (Tax ID): 0-1055-55081-71-4 (สำนักงานใหญ่)</p>
        </div>
      </div>

      {/* Summary KPI Cards */}
      {taxData && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
            <p className="text-xs text-slate-500 font-semibold uppercase">ภาษีขายรวม (Output VAT 7%)</p>
            <p className="text-2xl font-black text-emerald-600 font-mono mt-1">
              ฿{taxData.outputVatTotal.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-slate-400 mt-1">คำนวณจากเอกสารขาย {taxData.salesDocsCount} บิล</p>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
            <p className="text-xs text-slate-500 font-semibold uppercase">ภาษีซื้อรวม (Input VAT 7%)</p>
            <p className="text-2xl font-black text-blue-600 font-mono mt-1">
              ฿{taxData.inputVatTotal.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-slate-400 mt-1">คำนวณจากเอกสารซื้อ {taxData.purchaseDocsCount} บิล</p>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
            <p className="text-xs text-slate-500 font-semibold uppercase">ภาษีมูลค่าเพิ่มนำส่งสุทธิ (Net VAT)</p>
            <p className="text-2xl font-black text-purple-600 font-mono mt-1">
              ฿{taxData.netVatPayable.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-slate-400 mt-1">ภาษีขาย minus ภาษีซื้อ</p>
          </div>
        </div>
      )}
    </div>
  );
}
