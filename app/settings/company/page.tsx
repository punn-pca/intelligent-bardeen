'use client';

import React, { useState, useEffect } from 'react';
import { Building2, Save, CheckCircle2, AlertCircle, CreditCard, FileText, Globe, Phone, Mail } from 'lucide-react';
import { useRole } from '@/components/context/RoleContext';

export default function CompanySettingsPage() {
  const { currentRole } = useRole();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const [name, setName] = useState('');
  const [taxId, setTaxId] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [website, setWebsite] = useState('');
  const [bankName, setBankName] = useState('');
  const [bankAccountNo, setBankAccountNo] = useState('');
  const [bankAccountName, setBankAccountName] = useState('');
  const [defaultNotes, setDefaultNotes] = useState('');
  const [signaturePreparedLabel, setSignaturePreparedLabel] = useState('');
  const [signatureApprovedLabel, setSignatureApprovedLabel] = useState('');
  const [signatureReceivedLabel, setSignatureReceivedLabel] = useState('');

  useEffect(() => {
    async function loadSettings() {
      try {
        setLoading(true);
        const res = await fetch('/api/company-settings');
        const data = await res.json();

        setName(data.name || '');
        setTaxId(data.taxId || '');
        setAddress(data.address || '');
        setPhone(data.phone || '');
        setEmail(data.email || '');
        setWebsite(data.website || '');
        setBankName(data.bankName || '');
        setBankAccountNo(data.bankAccountNo || '');
        setBankAccountName(data.bankAccountName || '');
        setDefaultNotes(data.defaultNotes || '');
        setSignaturePreparedLabel(data.signaturePreparedLabel || 'ผู้จัดทำ (Prepared By)');
        setSignatureApprovedLabel(data.signatureApprovedLabel || 'ผู้อนุมัติ (Approved By)');
        setSignatureReceivedLabel(data.signatureReceivedLabel || 'ผู้รับสินค้า / ลูกค้า (Received By)');
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }

    loadSettings();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMsg('');
    setErrorMsg('');

    try {
      setSaving(true);
      const res = await fetch('/api/company-settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': currentRole || 'ADMIN',
        },
        body: JSON.stringify({
          name,
          taxId,
          address,
          phone,
          email,
          website,
          bankName,
          bankAccountNo,
          bankAccountName,
          defaultNotes,
          signaturePreparedLabel,
          signatureApprovedLabel,
          signatureReceivedLabel,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update company settings');

      setSuccessMsg('บันทึกการตั้งค่าข้อมูลบริษัทเรียบร้อยแล้ว!');
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="border-b border-slate-200 pb-5">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <Building2 className="w-7 h-7 text-blue-600" />
          <span>ระบบตั้งค่าบริษัท (Company Settings)</span>
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          กำหนดข้อมูลนิติบุคคล เลขประจำตัวผู้เสียภาษี ช่องทางติดต่อ บัญชีธนาคาร และลายเซ็นเอกสาร PDF
        </p>
      </div>

      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 p-4 rounded-xl text-sm flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600" />
          <span className="font-semibold">{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 p-4 rounded-xl text-sm flex items-center gap-2">
          <AlertCircle className="w-5 h-5 shrink-0 text-rose-600" />
          <span>{errorMsg}</span>
        </div>
      )}

      {loading ? (
        <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center text-slate-400">
          กำลังโหลดข้อมูลการตั้งค่าบริษัท...
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Section 1: General Company Info */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
              <Building2 className="w-5 h-5 text-blue-600" />
              <span>1. ข้อมูลทั่วไปของนิติบุคคล (Company Identity)</span>
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">ชื่อบริษัท / นิติบุคคล *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:border-blue-500 font-bold text-slate-900"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">เลขประจำตัวผู้เสียภาษี (Tax ID) *</label>
                <input
                  type="text"
                  required
                  value={taxId}
                  onChange={(e) => setTaxId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:border-blue-500 font-mono"
                />
              </div>
            </div>

            <div className="text-xs">
              <label className="block font-semibold text-slate-700 mb-1">ที่อยู่จดทะเบียน *</label>
              <textarea
                rows={2}
                required
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Section 2: Contact & Web */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
              <Globe className="w-5 h-5 text-indigo-600" />
              <span>2. ช่องทางติดต่อและเว็บไซต์ (Contact Details)</span>
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1 flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  <span>เบอร์โทรศัพท์</span>
                </label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1 flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  <span>อีเมล</span>
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1 flex items-center gap-1">
                  <Globe className="w-3.5 h-3.5 text-slate-400" />
                  <span>เว็บไซต์</span>
                </label>
                <input
                  type="text"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:border-blue-500 font-mono"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Bank Account */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
              <CreditCard className="w-5 h-5 text-emerald-600" />
              <span>3. ข้อมูลบัญชีธนาคารสำหรับโอนเงิน (Bank Account Payment Details)</span>
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">ชื่อธนาคาร</label>
                <input
                  type="text"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  placeholder="เช่น ธนาคารกสิกรไทย (KBANK)"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">เลขที่บัญชี</label>
                <input
                  type="text"
                  value={bankAccountNo}
                  onChange={(e) => setBankAccountNo(e.target.value)}
                  placeholder="เช่น 123-4-56789-0"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:border-blue-500 font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">ชื่อบัญชี</label>
                <input
                  type="text"
                  value={bankAccountName}
                  onChange={(e) => setBankAccountName(e.target.value)}
                  placeholder="เช่น บมจ. อินเทลลิเจนท์ บาร์ดีน"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Section 4: Document Customizations */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
              <FileText className="w-5 h-5 text-amber-600" />
              <span>4. กำหนดรูปแบบเอกสารและลายเซ็น PDF (PDF & Document Terms)</span>
            </h2>

            <div className="text-xs">
              <label className="block font-semibold text-slate-700 mb-1">หมายเหตุเริ่มต้นท้ายเอกสาร (Default Document Notes)</label>
              <textarea
                rows={2}
                value={defaultNotes}
                onChange={(e) => setDefaultNotes(e.target.value)}
                placeholder="ข้อตกลงและเงื่อนไขเพิ่มเติมที่แสดงท้ายใบเสนอราคา/Invoice..."
                className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:border-blue-500"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">ป้ายกำกับลายเซ็นช่องที่ 1</label>
                <input
                  type="text"
                  value={signaturePreparedLabel}
                  onChange={(e) => setSignaturePreparedLabel(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">ป้ายกำกับลายเซ็นช่องที่ 2</label>
                <input
                  type="text"
                  value={signatureApprovedLabel}
                  onChange={(e) => setSignatureApprovedLabel(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">ป้ายกำกับลายเซ็นช่องที่ 3</label>
                <input
                  type="text"
                  value={signatureReceivedLabel}
                  onChange={(e) => setSignatureReceivedLabel(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Submit */}
          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm shadow-md shadow-blue-600/30 flex items-center gap-2 transition-all"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'กำลังบันทึก...' : 'บันทึกการตั้งค่าบริษัท (Save Company Settings)'}</span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
