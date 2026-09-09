'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Package, Boxes, Grid, Building2, ArrowDownRight, ArrowUpRight,
  ArrowLeftRight, Sliders, History, ShieldCheck, FileBarChart, Users, FileText,
  Truck, UserCheck, Settings, ClipboardList, Layers, CircleDollarSign, CheckSquare,
  Receipt, Landmark, BrainCircuit,
} from 'lucide-react';
import { useRole } from '@/components/context/RoleContext';
import { hasPermission } from '@/lib/auth';

export default function Sidebar() {
  const pathname = usePathname();
  const { currentRole } = useRole();

  const navGroups = [
    { groupName: 'หลัก (MAIN)', items: [{ name: 'แดชบอร์ด (Dashboard)', href: '/', icon: LayoutDashboard, perm: 'inventory:read' }] },
    {
      groupName: 'คลังสินค้า (INVENTORY)',
      items: [
        { name: 'ตารางสต๊อกหลัก (Stock Matrix)', href: '/inventory', icon: Boxes, perm: 'inventory:read' },
        { name: 'Box Inventory + QR + AI', href: '/box-inventory', icon: BrainCircuit, perm: 'inventory:read' },
        { name: 'ประวัติสต๊อก (Stock Movement)', href: '/movements', icon: History, perm: 'inventory:read' },
        { name: 'ประกอบตู้ / BOM (Assembly)', href: '/bundles', icon: Layers, perm: 'stock:bundle' },
        { name: 'รับสินค้าเข้า (Stock In)', href: '/stock-in', icon: ArrowDownRight, perm: 'stock:in' },
        { name: 'เบิกสินค้าออก (Stock Out)', href: '/stock-out', icon: ArrowUpRight, perm: 'stock:out' },
        { name: 'โอนสินค้า (Transfer)', href: '/stock-transfer', icon: ArrowLeftRight, perm: 'stock:transfer' },
        { name: 'ปรับยอด (Adjustment)', href: '/stock-adjustment', icon: Sliders, perm: 'stock:adjustment' },
        { name: 'นับสต็อก (Stock Audit)', href: '/stock-audit', icon: ClipboardList, perm: 'stock:audit' },
      ],
    },
    {
      groupName: 'การขายและลูกค้า (SALES & CUSTOMERS)',
      items: [
        { name: 'เอกสารขาย (Sales Orders & Invoices)', href: '/documents', icon: FileText, perm: 'documents:read' },
        { name: 'รายชื่อลูกค้า / สาขา (Customers)', href: '/customers', icon: UserCheck, perm: 'customers:read' },
      ],
    },
    {
      groupName: 'การจัดซื้อและซัพพลายเออร์ (PURCHASE)',
      items: [
        { name: 'เอกสารซื้อ (PR / PO / GRN)', href: '/documents?type=PO', icon: ClipboardList, perm: 'documents:read' },
        { name: 'ซัพพลายเออร์ (Suppliers)', href: '/suppliers', icon: Truck, perm: 'suppliers:read' },
      ],
    },
    {
      groupName: 'การเงินและภาษี (FINANCE & TAX)',
      items: [
        { name: 'ลูกหนี้การค้า (AR & Receipts)', href: '/finance/ar', icon: Landmark, perm: 'documents:read' },
        { name: 'เจ้าหนี้การค้า (AP & Payments)', href: '/finance/ap', icon: Receipt, perm: 'documents:read' },
        { name: 'รายงานภาษี (VAT & WHT)', href: '/finance/tax', icon: CircleDollarSign, perm: 'reports:read' },
      ],
    },
    {
      groupName: 'สินค้าและคลัง (PRODUCTS & WAREHOUSE)',
      items: [
        { name: 'แคตตาล็อกสินค้า (Products)', href: '/products', icon: Package, perm: 'products:read' },
        { name: 'หมวดหมู่สินค้า (Categories)', href: '/categories', icon: Grid, perm: 'categories:read' },
        { name: 'คลังสินค้า (Warehouses)', href: '/warehouses', icon: Building2, perm: 'warehouses:read' },
        { name: 'ตรวจสอบสต๊อก (Integrity)', href: '/integrity', icon: ShieldCheck, perm: 'stock:integrity' },
      ],
    },
    {
      groupName: 'รายงานและอนุมัติ (REPORTS & APPROVALS)',
      items: [
        { name: 'รายงานสรุป (Reports)', href: '/reports', icon: FileBarChart, perm: 'reports:read' },
        { name: 'ระบบอนุมัติเอกสาร (Approvals)', href: '/admin/approvals', icon: CheckSquare, perm: 'documents:approve' },
      ],
    },
    {
      groupName: 'การจัดการระบบ (ADMINISTRATION)',
      items: [
        { name: 'ตั้งค่าบริษัท (Company)', href: '/settings/company', icon: Settings, perm: 'company:manage' },
        { name: 'จัดการผู้ใช้งาน (Users)', href: '/users', icon: Users, perm: 'users:manage' },
        { name: 'Audit Logs (ประวัติระบบ)', href: '/audit-logs', icon: History, perm: 'audit_logs:read' },
      ],
    },
  ];

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col shrink-0 border-r border-slate-800 h-screen sticky top-0">
      <div className="p-4 border-b border-slate-800 flex items-center gap-3">
        <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center text-white font-black text-lg shadow-md shadow-blue-600/30">S&B</div>
        <div><h1 className="font-bold text-white tracking-tight leading-none text-sm">S&B ENTERPRISE ERP</h1><span className="text-[10px] text-blue-400 font-semibold tracking-wider uppercase">Official Corporate ERP</span></div>
      </div>
      <nav className="flex-1 p-3 space-y-4 overflow-y-auto custom-scrollbar">
        {navGroups.map((group, idx) => {
          const visibleItems = group.items.filter((item) => hasPermission(currentRole as any, item.perm));
          if (!visibleItems.length) return null;
          return <div key={idx} className="space-y-1"><p className="px-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">{group.groupName}</p>{visibleItems.map((item) => { const isActive = pathname === item.href; const Icon = item.icon; return <Link key={item.href} href={item.href} className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-all ${isActive ? 'bg-blue-600 text-white font-semibold shadow-xs' : 'text-slate-400 hover:bg-slate-800/80 hover:text-slate-200'}`}><Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} /><span className="truncate">{item.name}</span></Link>; })}</div>;
        })}
      </nav>
      <div className="p-3 border-t border-slate-800 text-[11px] text-slate-500 flex items-center justify-between"><span>S&B ERP v3.0 (Enterprise)</span><span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /></div>
    </aside>
  );
}
