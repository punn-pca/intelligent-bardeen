'use client';

import React, { useState, useEffect } from 'react';
import { X, Printer, Download, FileText } from 'lucide-react';
import { generateDocumentHTML, DocumentPrintData } from '@/lib/pdf-generator';
import { CompanyConfig } from '@/lib/company-config';

interface PDFPreviewModalProps {
  document: DocumentPrintData;
  onClose: () => void;
}

export default function PDFPreviewModal({ document, onClose }: PDFPreviewModalProps) {
  const [liveCompanyConfig, setLiveCompanyConfig] = useState<CompanyConfig | null>(document.companyConfig || null);

  useEffect(() => {
    async function fetchLiveCompanySettings() {
      try {
        const res = await fetch('/api/company-settings');
        if (res.ok) {
          const config = await res.json();
          setLiveCompanyConfig(config);
        }
      } catch (e) {
        console.error('Failed to fetch live company settings for PDF:', e);
      }
    }

    fetchLiveCompanySettings();
  }, []);

  const mergedDocument: DocumentPrintData = {
    ...document,
    companyConfig: liveCompanyConfig || document.companyConfig,
  };

  const htmlContent = generateDocumentHTML(mergedDocument);

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
      }, 500);
    }
  };

  const handleDownloadHTML = () => {
    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = window.document.createElement('a');
    a.href = url;
    a.download = `${document.documentNo}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">{document.documentNo} - PDF Preview</h2>
              <p className="text-xs text-slate-500">{document.documentType} ({document.status})</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-2 transition-all shadow-xs"
            >
              <Printer className="w-4 h-4" />
              <span>พิมพ์เอกสาร (Print)</span>
            </button>

            <button
              onClick={handleDownloadHTML}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-2 transition-all shadow-xs"
            >
              <Download className="w-4 h-4" />
              <span>ดาวน์โหลด (HTML / PDF)</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/50 transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Live HTML Document Preview Frame */}
        <div className="flex-1 p-6 bg-slate-100 overflow-y-auto">
          <div className="bg-white shadow-md rounded-xl p-6 border border-slate-200 max-w-3xl mx-auto">
            <iframe
              srcDoc={htmlContent}
              className="w-full h-[650px] border-0"
              title="Document Preview"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
