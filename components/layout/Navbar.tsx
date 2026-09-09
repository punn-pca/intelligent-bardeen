'use client';

import React, { useState } from 'react';
import { Search, QrCode, Shield, User, ChevronDown } from 'lucide-react';
import { useRole } from '@/components/context/RoleContext';
import GlobalSearchModal from '@/components/common/GlobalSearchModal';
import BarcodeScannerModal from '@/components/common/BarcodeScannerModal';

export default function Navbar() {
  const { currentRole, setCurrentRole } = useRole();
  const [searchOpen, setSearchOpen] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);

  const roles = [
    { code: 'ADMIN', label: 'System Admin (ADMIN)' },
    { code: 'MANAGER', label: 'Inventory Manager (MANAGER)' },
    { code: 'WAREHOUSE', label: 'Warehouse Officer (WAREHOUSE)' },
    { code: 'ACCOUNTING', label: 'Accountant (ACCOUNTING)' },
    { code: 'USER', label: 'General User (USER)' },
  ];

  return (
    <>
      <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between shrink-0 shadow-xs z-10">
        {/* Left Search Bar Trigger */}
        <button
          onClick={() => setSearchOpen(true)}
          className="flex items-center gap-3 bg-slate-100 hover:bg-slate-200/70 text-slate-400 px-4 py-2 rounded-xl text-xs w-80 transition-all border border-slate-200/60"
        >
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <span className="flex-1 text-left">ค้นหาสินค้า, SKU, บาร์โค้ด, เอกสาร (Ctrl+K)...</span>
          <kbd className="bg-white border border-slate-200 rounded px-1.5 py-0.5 text-[10px] text-slate-500 font-mono shadow-2xs">
            Ctrl+K
          </kbd>
        </button>

        {/* Right Controls */}
        <div className="flex items-center gap-4">
          {/* Barcode Trigger */}
          <button
            onClick={() => setScannerOpen(true)}
            className="flex items-center gap-2 bg-blue-50 hover:bg-blue-100 text-blue-700 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border border-blue-200"
          >
            <QrCode className="w-4 h-4" />
            <span>สแกนบาร์โค้ด</span>
          </button>

          <div className="h-6 w-px bg-slate-200" />

          {/* Role Switcher Dropdown */}
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5">
            <Shield className="w-4 h-4 text-blue-600" />
            <span className="text-xs font-semibold text-slate-500">สิทธิ์:</span>
            <select
              value={currentRole}
              onChange={(e) => setCurrentRole(e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-800 outline-none cursor-pointer pr-1"
            >
              {roles.map((r) => (
                <option key={r.code} value={r.code}>
                  {r.label}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </div>

          {/* User Profile */}
          <div className="flex items-center gap-2 pl-2">
            <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-bold shadow-2xs">
              <User className="w-4 h-4" />
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-xs font-bold text-slate-800 leading-tight">Active Session</p>
              <p className="text-[10px] text-blue-600 font-semibold leading-tight">{currentRole}</p>
            </div>
          </div>
        </div>
      </header>

      {searchOpen && <GlobalSearchModal onClose={() => setSearchOpen(false)} />}
      {scannerOpen && <BarcodeScannerModal onClose={() => setScannerOpen(false)} />}
    </>
  );
}
