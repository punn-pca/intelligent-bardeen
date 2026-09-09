'use client';

import React, { useState, useEffect } from 'react';
import { FileText, Plus, Search, Filter, Calendar, Eye, CheckCircle2, AlertTriangle, FileCheck, XCircle, ArrowRightLeft, Link as LinkIcon } from 'lucide-react';
import Link from 'next/link';
import { useRole } from '@/components/context/RoleContext';
import PDFPreviewModal from '@/components/documents/PDFPreviewModal';

export default function DocumentsPage() {
  const { currentRole } = useRole();
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [previewDoc, setPreviewDoc] = useState<any | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  async function loadDocuments() {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (selectedType) params.append('type', selectedType);
      if (selectedStatus) params.append('status', selectedStatus);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const res = await fetch(`/api/documents?${params.toString()}`);
      const data = await res.json();
      setDocuments(data.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDocuments();
  }, [search, selectedType, selectedStatus, startDate, endDate]);

  const handleDocumentAction = async (documentId: string, action: 'approve' | 'issue' | 'cancel') => {
    try {
      setActionLoading(true);
      setErrorMsg('');
      setSuccessMsg('');
      const reason = action === 'cancel' ? prompt('กรุณาระบุเหตุผลในการยกเลิกเอกสาร:') || 'Cancelled by user' : undefined;

      const res = await fetch(`/api/documents/${documentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': currentRole || 'ADMIN',
        },
        body: JSON.stringify({ action, reason }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || `Failed to ${action} document`);
      }

      await loadDocuments();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleConvertDocument = async (sourceDoc: any, targetType: string) => {
    try {
      setActionLoading(true);
      setErrorMsg('');
      setSuccessMsg('');

      const res = await fetch('/api/documents/convert', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': currentRole || 'ADMIN',
        },
        body: JSON.stringify({
          sourceDocumentId: sourceDoc.id,
          targetType,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to convert document');
      }

      setSuccessMsg(`แปลงเอกสารสำเร็จ! สร้างเอกสาร ${data.documentNo} จาก ${sourceDoc.documentNo} เรียบร้อยแล้ว`);
      await loadDocuments();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const getTargetConvertType = (docType: string) => {
    switch (docType) {
      case 'QUOTATION': return { target: 'SO', label: 'Convert to SO' };
      case 'SO': return { target: 'DELIVERY_NOTE', label: 'Convert to DO' };
      case 'DELIVERY_NOTE': return { target: 'INVOICE', label: 'Convert to INV' };
      case 'INVOICE': return { target: 'RECEIPT', label: 'Convert to RC' };
      default: return null;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <FileText className="w-7 h-7 text-blue-600" />
            <span>ระบบเอกสารกลาง (Central Document Engine)</span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            จัดการเอกสารซื้อ-ขาย คลังสินค้า บัญชี One-Click Document Conversion (QT ➔ SO ➔ DO ➔ INV ➔ RC) และพิมพ์ PDF
          </p>
        </div>

        <Link
          href="/documents/create"
          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold flex items-center gap-2 shadow-xs transition-all shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>+ ออกเอกสารใหม่ (Create Document)</span>
        </Link>
      </div>

      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 p-3.5 rounded-lg text-sm flex items-center gap-2 font-bold">
          <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 p-3.5 rounded-lg text-sm flex items-center gap-2 font-bold">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1 min-w-[240px]">
            <Search className="w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ค้นหาเลขที่เอกสาร, ซัพพลายเออร์, ลูกค้า, หมายเหตุ..."
              className="w-full text-sm outline-none text-slate-800 placeholder-slate-400 font-mono"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="text-xs border border-slate-300 rounded-lg px-3 py-2 bg-slate-50 outline-none font-medium"
            >
              <option value="">ทุกประเภทเอกสาร (All Types)</option>
              <option value="PR">PR - ใบขอซื้อ</option>
              <option value="PO">PO - ใบสั่งซื้อ</option>
              <option value="GRN">GRN - ใบรับสินค้า</option>
              <option value="QUOTATION">QUOTATION - ใบเสนอราคา</option>
              <option value="SO">SO - ใบสั่งขาย</option>
              <option value="DELIVERY_NOTE">DN - ใบส่งสินค้า</option>
              <option value="STOCK_ISSUE">ISSUE - ใบเบิกสินค้า</option>
              <option value="STOCK_TRANSFER">TRANSFER - ใบโอนสินค้า</option>
              <option value="STOCK_ADJUSTMENT">ADJUST - ใบปรับสต็อก</option>
              <option value="INVOICE">INV - ใบแจ้งหนี้</option>
              <option value="RECEIPT">RC - ใบเสร็จรับเงิน</option>
            </select>

            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="text-xs border border-slate-300 rounded-lg px-3 py-2 bg-slate-50 outline-none font-medium"
            >
              <option value="">ทุกสถานะ (All Status)</option>
              <option value="DRAFT">DRAFT</option>
              <option value="PENDING_APPROVAL">PENDING APPROVAL</option>
              <option value="APPROVED">APPROVED</option>
              <option value="ISSUED">ISSUED</option>
              <option value="CANCELLED">CANCELLED</option>
            </select>
          </div>
        </div>

        {/* Date Filters */}
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
        </div>
      </div>

      {/* Documents Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500 uppercase text-xs border-b border-slate-200">
              <tr>
                <th className="p-4">เลขที่เอกสาร</th>
                <th className="p-4">ประเภท</th>
                <th className="p-4">อ้างอิงต้นทาง</th>
                <th className="p-4">สถานะ</th>
                <th className="p-4">คู่ค้า (Customer/Supplier)</th>
                <th className="p-4 text-right">ยอดรวมสุทธิ</th>
                <th className="p-4 text-center">จัดการ / Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-slate-400">
                    กำลังโหลดข้อมูลเอกสาร...
                  </td>
                </tr>
              ) : documents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-slate-400">
                    ไม่พบเอกสารในระบบ
                  </td>
                </tr>
              ) : (
                documents.map((d) => {
                  const partyName = d.customer?.name || d.supplier?.name || d.warehouse?.name || '-';
                  const dateStr = d.issueDate ? new Date(d.issueDate).toLocaleDateString('en-US') : '-';
                  const convertInfo = getTargetConvertType(d.documentType);
                  const grandTotalVal = typeof d.grandTotal === 'number' ? d.grandTotal : 0;

                  return (
                    <tr key={d.id} className="hover:bg-slate-50/80 transition-all">
                      <td className="p-4 font-mono font-bold text-slate-900 text-xs">
                        <div>{d.documentNo || '-'}</div>
                        <div className="text-[10px] text-slate-400 font-sans font-normal" suppressHydrationWarning>{dateStr}</div>
                      </td>
                      <td className="p-4">
                        <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                          {d.documentType || 'DOC'}
                        </span>
                      </td>
                      <td className="p-4 text-xs font-mono text-blue-600">
                        {d.parentDocumentNo ? (
                          <span className="inline-flex items-center gap-1 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 font-bold">
                            <LinkIcon className="w-3 h-3 text-blue-500" />
                            <span>{d.parentDocumentNo}</span>
                          </span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                      <td className="p-4">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                            d.status === 'ISSUED'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : d.status === 'APPROVED'
                              ? 'bg-blue-50 text-blue-700 border-blue-200'
                              : d.status === 'CANCELLED'
                              ? 'bg-rose-50 text-rose-700 border-rose-200'
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}
                        >
                          {d.status || 'DRAFT'}
                        </span>
                      </td>
                      <td className="p-4 text-xs font-medium text-slate-800">{partyName}</td>
                      <td className="p-4 text-right font-mono font-bold text-slate-900 text-xs">
                        ฿{grandTotalVal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="p-4">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Preview PDF */}
                          <button
                            onClick={() => setPreviewDoc(d)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-all border border-slate-200"
                            title="ดูตัวอย่าง / พิมพ์ PDF"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* One-Click Document Conversion Action */}
                          {convertInfo && d.status !== 'CANCELLED' && (
                            <button
                              disabled={actionLoading}
                              onClick={() => handleConvertDocument(d, convertInfo.target)}
                              className="px-2.5 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded text-[11px] font-bold flex items-center gap-1 shadow-2xs transition-all"
                              title={`แปลงเอกสารไปยัง ${convertInfo.target}`}
                            >
                              <ArrowRightLeft className="w-3.5 h-3.5" />
                              <span>{convertInfo.label}</span>
                            </button>
                          )}

                          {/* Approve Action */}
                          {d.status === 'DRAFT' || d.status === 'PENDING_APPROVAL' ? (
                            <button
                              disabled={actionLoading}
                              onClick={() => handleDocumentAction(d.id, 'approve')}
                              className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-[11px] font-semibold flex items-center gap-1"
                              title="อนุมัติเอกสาร"
                            >
                              <FileCheck className="w-3.5 h-3.5" />
                              <span>อนุมัติ</span>
                            </button>
                          ) : null}

                          {/* Issue Action */}
                          {d.status === 'APPROVED' ? (
                            <button
                              disabled={actionLoading}
                              onClick={() => handleDocumentAction(d.id, 'issue')}
                              className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[11px] font-semibold flex items-center gap-1"
                              title="ออกเอกสารและตัด/รับสต็อก"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>ออกเอกสาร (Issue)</span>
                            </button>
                          ) : null}

                          {/* Cancel Action */}
                          {d.status !== 'CANCELLED' ? (
                            <button
                              disabled={actionLoading}
                              onClick={() => handleDocumentAction(d.id, 'cancel')}
                              className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-all border border-slate-200"
                              title="ยกเลิกเอกสาร (Cancel & Reverse Ledger)"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Live PDF Preview Modal */}
      {previewDoc && (
        <PDFPreviewModal
          document={previewDoc}
          onClose={() => setPreviewDoc(null)}
        />
      )}
    </div>
  );
}
