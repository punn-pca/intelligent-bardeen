'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Search, QrCode, Shield, User, ChevronDown, LogOut, LogIn, Menu, Sun, Moon } from 'lucide-react';
import { useRole } from '@/components/context/RoleContext';
import { useAuth } from '@/components/context/AuthContext';
import { useUI } from '@/components/context/UIContext';
import GlobalSearchModal from '@/components/common/GlobalSearchModal';
import BarcodeScannerModal from '@/components/common/BarcodeScannerModal';

export default function Navbar() {
  const { currentRole, setCurrentRole } = useRole();
  const { authUser, logout } = useAuth();
  const { theme, toggleTheme, toggleMobileMenu } = useUI();
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
      <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 md:px-6 flex items-center justify-between shrink-0 shadow-xs z-10 transition-colors">
        {/* Left Side: Mobile Hamburger Menu & Search Bar */}
        <div className="flex items-center gap-3">
          <button
            onClick={toggleMobileMenu}
            className="md:hidden p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            title="เปิดเมนู (Mobile Menu)"
          >
            <Menu className="w-5 h-5" />
          </button>

          <button
            onClick={() => setSearchOpen(true)}
            className="flex items-center gap-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200/70 dark:hover:bg-slate-700/70 text-slate-400 dark:text-slate-400 px-3 md:px-4 py-2 rounded-xl text-xs w-48 sm:w-64 md:w-80 transition-all border border-slate-200/60 dark:border-slate-700/60"
          >
            <Search className="w-4 h-4 text-slate-400 shrink-0" />
            <span className="flex-1 text-left truncate">ค้นหาสินค้า, SKU, บาร์โค้ด...</span>
            <kbd className="hidden sm:inline-block bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded px-1.5 py-0.5 text-[10px] text-slate-500 font-mono shadow-2xs">
              Ctrl+K
            </kbd>
          </button>
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-2 sm:gap-4">
          {/* Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            className="p-2 text-slate-500 dark:text-amber-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            title={theme === 'dark' ? 'เปลี่ยนเป็นธีมสว่าง (Light Mode)' : 'เปลี่ยนเป็นธีมมืด (Dark Mode)'}
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* Barcode Trigger */}
          <button
            onClick={() => setScannerOpen(true)}
            className="hidden sm:flex items-center gap-2 bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-300 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border border-blue-200 dark:border-blue-800"
          >
            <QrCode className="w-4 h-4" />
            <span>สแกนบาร์โค้ด</span>
          </button>

          <div className="hidden sm:block h-6 w-px bg-slate-200 dark:bg-slate-800" />

          {/* Role Switcher Dropdown */}
          <div className="hidden sm:flex items-center gap-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5">
            <Shield className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">สิทธิ์:</span>
            <select
              value={currentRole}
              onChange={(e) => setCurrentRole(e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-800 dark:text-slate-100 outline-none cursor-pointer pr-1"
            >
              {roles.map((r) => (
                <option key={r.code} value={r.code} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
                  {r.label}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </div>

          {/* User Profile */}
          <div className="flex items-center gap-3 pl-1 sm:pl-2">
            {authUser ? (
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-emerald-700 text-white flex items-center justify-center text-xs font-bold shadow-2xs">
                  {authUser.displayName?.[0]?.toUpperCase() || <User className="w-4 h-4" />}
                </div>
                <div className="hidden lg:block text-left">
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-100 leading-tight">
                    {authUser.displayName || authUser.email?.split('@')[0]}
                  </p>
                  <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold leading-tight flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <span>Firebase Auth ({authUser.role})</span>
                  </p>
                </div>
                <button
                  onClick={() => logout()}
                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition-colors ml-1"
                  title="ออกจากระบบ (Logout)"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <Link
                href="/login"
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors shadow-2xs"
              >
                <LogIn className="w-4 h-4" />
                <span className="hidden sm:inline">เข้าสู่ระบบ (Login)</span>
              </Link>
            )}
          </div>
        </div>
      </header>

      {searchOpen && <GlobalSearchModal onClose={() => setSearchOpen(false)} />}
      {scannerOpen && <BarcodeScannerModal onClose={() => setScannerOpen(false)} />}
    </>
  );
}
