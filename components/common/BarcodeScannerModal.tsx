'use client';

import React, { useState, useEffect } from 'react';
import { Barcode, Camera, X, Check, Search } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface BarcodeScannerModalProps {
  onClose: () => void;
  onScan?: (barcode: string) => void;
}

export default function BarcodeScannerModal({ onClose, onScan }: BarcodeScannerModalProps) {
  const [manualBarcode, setManualBarcode] = useState('');
  const [isSimulatingCamera, setIsSimulatingCamera] = useState(true);
  const [scannedResult, setScannedResult] = useState<string | null>(null);
  const router = useRouter();

  // Hardware Scanner Listener (Detect fast typing ending with Enter)
  useEffect(() => {
    let barcodeBuffer = '';
    let lastKeyTime = Date.now();

    const handleKeyDown = (e: KeyboardEvent) => {
      const currentTime = Date.now();
      if (currentTime - lastKeyTime > 100) {
        barcodeBuffer = '';
      }
      lastKeyTime = currentTime;

      if (e.key === 'Enter') {
        if (barcodeBuffer.length >= 3) {
          handleBarcodeScanned(barcodeBuffer);
        }
        barcodeBuffer = '';
      } else if (e.key.length === 1) {
        barcodeBuffer += e.key;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleBarcodeScanned = (code: string) => {
    setScannedResult(code);
    if (onScan) {
      onScan(code);
    }
  };

  const handleLookupProduct = async () => {
    const code = scannedResult || manualBarcode;
    if (!code) return;

    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(code)}`);
      const data = await res.json();
      if (data.products && data.products.length > 0) {
        router.push(data.products[0].url);
        onClose();
      } else {
        alert(`ไม่พบสินค้าที่มี Barcode / SKU: ${code}`);
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-100 animate-in fade-in zoom-in duration-200">
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Barcode className="w-5 h-5 text-emerald-400" />
            <h3 className="font-semibold text-lg">เครื่องสแกนบาร์โค้ด (Barcode Scanner)</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Camera Scan Simulation View */}
          <div className="relative bg-slate-950 rounded-xl h-52 flex flex-col items-center justify-center text-white overflow-hidden border-2 border-dashed border-emerald-500/50">
            {scannedResult ? (
              <div className="text-center space-y-2 animate-in fade-in">
                <div className="w-12 h-12 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto border border-emerald-500/40">
                  <Check className="w-6 h-6" />
                </div>
                <p className="text-xs text-slate-400">สแกนสำเร็จ!</p>
                <p className="font-mono text-xl font-bold text-emerald-400">{scannedResult}</p>
              </div>
            ) : (
              <>
                {/* Laser Red Line */}
                <div className="absolute inset-x-0 top-1/2 h-0.5 bg-rose-500 shadow-lg shadow-rose-500/80 animate-pulse" />
                <Camera className="w-10 h-10 text-slate-500 mb-2" />
                <p className="text-sm font-medium text-slate-300">นำบาร์โค้ดมาสแกนผ่านกล้อง หรือ ยิงด้วยเครื่องสแกน</p>
                <p className="text-xs text-slate-500 mt-1">รองรับ Hardware Barcode Scanner (USB / Bluetooth)</p>
              </>
            )}
          </div>

          {/* Manual Barcode Input Fallback */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              หรือป้อนรหัส Barcode / SKU ด้วยตนเอง
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={manualBarcode}
                onChange={(e) => setManualBarcode(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleLookupProduct()}
                placeholder="เช่น 8850001000011 หรือ SKU-001"
                className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
              />
              <button
                onClick={handleLookupProduct}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium flex items-center gap-1.5 shadow-xs"
              >
                <Search className="w-4 h-4" />
                <span>ค้นหา</span>
              </button>
            </div>
          </div>

          {/* Preset Test Barcodes */}
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs">
            <p className="font-semibold text-slate-600 mb-2">ตัวอย่าง Barcode สำหรับทดสอบสแกนเร็ว:</p>
            <div className="flex flex-wrap gap-2">
              {['8850001000011', '8850001000028', '8850001000059', '8850001000172'].map((code) => (
                <button
                  key={code}
                  onClick={() => handleBarcodeScanned(code)}
                  className="bg-white hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 font-mono px-2 py-1 rounded border border-slate-200 shadow-2xs"
                >
                  {code}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-6 py-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>กด <kbd className="bg-slate-200 px-1 rounded text-slate-700 font-mono">ESC</kbd> เพื่อปิด</span>
          {scannedResult && (
            <button
              onClick={() => setScannedResult(null)}
              className="text-emerald-600 hover:underline font-medium"
            >
              สแกนรหัสใหม่
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
