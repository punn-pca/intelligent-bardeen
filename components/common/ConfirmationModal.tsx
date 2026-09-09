'use client';

import React from 'react';
import { AlertTriangle, CheckCircle, ArrowRight, X } from 'lucide-react';

interface ConfirmationModalProps {
  title: string;
  details: { label: string; value: string | number }[];
  confirmText?: string;
  isLoading?: boolean;
  successResult?: { transactionId: string; message: string } | null;
  onConfirm: () => void;
  onClose: () => void;
  onViewTransaction?: (txId: string) => void;
}

export default function ConfirmationModal({
  title,
  details,
  confirmText = 'ยืนยันทำรายการ',
  isLoading = false,
  successResult = null,
  onConfirm,
  onClose,
  onViewTransaction,
}: ConfirmationModalProps) {
  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-100 animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="bg-slate-50 border-b border-slate-100 px-6 py-4 flex items-center justify-between">
          <h3 className="font-semibold text-slate-800 text-lg flex items-center gap-2">
            {successResult ? (
              <CheckCircle className="w-5 h-5 text-emerald-600" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-amber-500" />
            )}
            {successResult ? 'ทํารายการสำเร็จ' : title}
          </h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-4">
          {successResult ? (
            <div className="text-center py-3 space-y-4">
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto text-emerald-600">
                <CheckCircle className="w-10 h-10" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-600">{successResult.message}</p>
                <div className="mt-3 bg-slate-100 p-3 rounded-lg border border-slate-200 inline-block">
                  <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Transaction ID</p>
                  <p className="font-mono text-base font-bold text-emerald-700 mt-0.5">
                    {successResult.transactionId}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <>
              <p className="text-sm text-slate-600">กรุณาตรวจสอบข้อมูลรายการก่อนกดยืนยันการทำรายการ:</p>
              <div className="bg-slate-50 rounded-lg p-4 space-y-2 border border-slate-200/80">
                {details.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between text-sm">
                    <span className="text-slate-500">{item.label}:</span>
                    <span className="font-semibold text-slate-800">{item.value}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Footer Actions */}
        <div className="bg-slate-50 border-t border-slate-100 px-6 py-4 flex items-center justify-end gap-3">
          {successResult ? (
            <>
              <button
                onClick={onClose}
                className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg text-sm font-medium transition-all"
              >
                ปิดหน้าต่าง
              </button>
              {onViewTransaction && (
                <button
                  onClick={() => onViewTransaction(successResult.transactionId)}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium flex items-center gap-2 shadow-xs transition-all"
                >
                  <span>ดูรายละเอียด Transaction</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={onClose}
                disabled={isLoading}
                className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg text-sm font-medium transition-all disabled:opacity-50"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={onConfirm}
                disabled={isLoading}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium flex items-center gap-2 shadow-xs transition-all disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>กำลังประมวลผล...</span>
                  </>
                ) : (
                  <span>{confirmText}</span>
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
