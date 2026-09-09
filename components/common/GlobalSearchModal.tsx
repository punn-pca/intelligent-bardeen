'use client';

import React, { useState, useEffect } from 'react';
import { Search, X, Package, History, ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface GlobalSearchModalProps {
  onClose: () => void;
}

export default function GlobalSearchModal({ onClose }: GlobalSearchModalProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<{ products: any[]; transactions: any[] }>({
    products: [],
    transactions: [],
  });
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (!query.trim()) {
      setResults({ products: [], transactions: [] });
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        setResults(data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [query]);

  const handleSelect = (url: string) => {
    router.push(url);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-start justify-center pt-20 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
        {/* Search Input Bar */}
        <div className="p-4 border-b border-slate-100 flex items-center gap-3">
          <Search className="w-5 h-5 text-slate-400" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ค้นหา SKU, Barcode, ชื่อสินค้า, หรือ Transaction ID..."
            className="flex-1 text-slate-800 placeholder-slate-400 outline-none text-base font-medium"
          />
          {loading && <div className="w-4 h-4 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />}
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Results Container */}
        <div className="max-h-96 overflow-y-auto p-4 space-y-4">
          {!query.trim() ? (
            <div className="py-8 text-center text-slate-400 text-sm">
              พิมพ์คำค้นหาเพื่อเริ่มต้นค้นหาข้อมูลในระบบ
            </div>
          ) : results.products.length === 0 && results.transactions.length === 0 && !loading ? (
            <div className="py-8 text-center text-slate-400 text-sm">
              ไม่พบข้อมูลที่ตรงกับ <span className="font-semibold text-slate-700">"{query}"</span>
            </div>
          ) : (
            <>
              {/* Product Results */}
              {results.products.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold uppercase text-slate-400 tracking-wider mb-2 flex items-center gap-1.5">
                    <Package className="w-4 h-4 text-emerald-600" />
                    <span>รายการสินค้า ({results.products.length})</span>
                  </h4>
                  <div className="space-y-1">
                    {results.products.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => handleSelect(item.url)}
                        className="w-full text-left p-2.5 rounded-lg hover:bg-slate-50 flex items-center justify-between group transition-all"
                      >
                        <div>
                          <p className="font-semibold text-slate-800 text-sm group-hover:text-emerald-600 transition-colors">
                            {item.title}
                          </p>
                          <p className="text-xs text-slate-500">{item.subtitle}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs bg-emerald-50 text-emerald-700 font-semibold px-2 py-0.5 rounded border border-emerald-200">
                            คงเหลือ {item.onHand}
                          </span>
                          <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-emerald-600 group-hover:translate-x-0.5 transition-all" />
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Transaction Results */}
              {results.transactions.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold uppercase text-slate-400 tracking-wider mb-2 flex items-center gap-1.5 border-t border-slate-100 pt-3">
                    <History className="w-4 h-4 text-blue-600" />
                    <span>รายการเคลื่อนไหว Transaction ({results.transactions.length})</span>
                  </h4>
                  <div className="space-y-1">
                    {results.transactions.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => handleSelect(item.url)}
                        className="w-full text-left p-2.5 rounded-lg hover:bg-slate-50 flex items-center justify-between group transition-all"
                      >
                        <div>
                          <p className="font-mono font-semibold text-slate-800 text-sm group-hover:text-blue-600 transition-colors">
                            {item.title}
                          </p>
                          <p className="text-xs text-slate-500">{item.subtitle}</p>
                        </div>
                        <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
