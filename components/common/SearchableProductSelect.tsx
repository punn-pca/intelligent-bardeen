'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Search, ChevronDown, Check, X } from 'lucide-react';

interface SearchableProductSelectProps {
  products: any[];
  value: string;
  onChange: (productId: string) => void;
  placeholder?: string;
  required?: boolean;
  className?: string;
}

export default function SearchableProductSelect({
  products,
  value,
  onChange,
  placeholder = '-- ค้นหาและเลือกสินค้า (900+ รายการ) --',
  required = false,
  className = '',
}: SearchableProductSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedProduct = products.find((p) => p.id === value);

  // Flat filtering without category grouping as requested ("ไม่ต้องแยกหมวดหมู่")
  const filteredProducts = (Array.isArray(products) ? products : []).filter((p) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    const skuMatch = p.sku ? p.sku.toLowerCase().includes(term) : false;
    const barcodeMatch = p.barcode ? p.barcode.toLowerCase().includes(term) : false;
    const nameMatch = p.name ? p.name.toLowerCase().includes(term) : false;
    return skuMatch || barcodeMatch || nameMatch;
  });

  return (
    <div ref={dropdownRef} className={`relative w-full ${isOpen ? 'z-50' : 'z-10'} ${className}`}>
      {/* Hidden native input for form validation */}
      {required && (
        <input
          type="text"
          value={value}
          onChange={() => {}}
          required
          tabIndex={-1}
          className="opacity-0 absolute inset-0 pointer-events-none w-full h-full"
        />
      )}

      {/* Select Toggle Button */}
      <button
        type="button"
        onClick={() => {
          setIsOpen(!isOpen);
          setSearchTerm('');
        }}
        className={`w-full px-3 py-2 border rounded-lg text-xs bg-white flex items-center justify-between gap-2 text-left transition-all font-mono outline-none ${
          isOpen ? 'border-blue-500 ring-2 ring-blue-100 shadow-md' : 'border-slate-300 hover:border-slate-400'
        }`}
      >
        <span className="truncate">
          {selectedProduct ? (
            <span className="text-slate-900 font-semibold">
              <span className="text-blue-600 font-bold font-mono">[{selectedProduct.sku}]</span> {selectedProduct.name}
            </span>
          ) : (
            <span className="text-slate-400 font-sans">{placeholder}</span>
          )}
        </span>
        <div className="flex items-center gap-1 shrink-0 text-slate-400">
          {selectedProduct && (
            <span
              onClick={(e) => {
                e.stopPropagation();
                onChange('');
              }}
              className="p-0.5 hover:text-slate-600 hover:bg-slate-100 rounded cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </span>
          )}
          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isOpen ? 'rotate-180 text-blue-600' : ''}`} />
        </div>
      </button>

      {/* Searchable Dropdown Overlay (positioned to float freely over tables and cards) */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-full min-w-[340px] max-w-[480px] bg-white rounded-xl shadow-2xl border border-slate-200 z-50 overflow-hidden text-xs animate-in fade-in duration-100">
          {/* Quick Search Input with Icon */}
          <div className="p-2.5 bg-slate-50 border-b border-slate-200 flex items-center gap-2">
            <Search className="w-4 h-4 text-slate-400 shrink-0" />
            <input
              type="text"
              autoFocus
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="พิมพ์ SKU, บาร์โค้ด หรือชื่อสินค้า..."
              className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 outline-none focus:border-blue-500 font-mono shadow-inner"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Flat Un-grouped Product List */}
          <div className="max-h-64 overflow-y-auto divide-y divide-slate-100">
            {filteredProducts.length === 0 ? (
              <div className="p-4 text-center text-slate-400 italic">
                ไม่พบสินค้าตรงตามคำค้นหา "{searchTerm}"
              </div>
            ) : (
              filteredProducts.slice(0, 100).map((prod) => {
                const isSelected = prod.id === value;

                return (
                  <div
                    key={prod.id}
                    onClick={() => {
                      onChange(prod.id);
                      setIsOpen(false);
                    }}
                    className={`p-2.5 cursor-pointer flex items-center justify-between transition-colors ${
                      isSelected ? 'bg-blue-50 text-blue-700 font-semibold' : 'hover:bg-slate-50 text-slate-800'
                    }`}
                  >
                    <div className="truncate pr-2">
                      <div className="font-mono font-bold text-xs flex items-center gap-2">
                        <span className="text-blue-600 shrink-0">[{prod.sku}]</span>
                        <span className="text-slate-900 font-sans font-semibold truncate">{prod.name}</span>
                      </div>
                      {prod.barcode && (
                        <span className="text-[10px] text-slate-400 font-mono block">Barcode: {prod.barcode}</span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {prod.unit && (
                        <span className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-500 font-sans">
                          {prod.unit}
                        </span>
                      )}
                      {isSelected && <Check className="w-4 h-4 text-blue-600" />}
                    </div>
                  </div>
                );
              })
            )}

            {filteredProducts.length > 100 && (
              <div className="p-2 bg-slate-50 text-center text-[11px] text-slate-500 border-t border-slate-100 font-sans">
                แสดง 100 รายการแรก พิมพ์คำค้นหาเพิ่มเพื่อเจาะจงสินค้า
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
