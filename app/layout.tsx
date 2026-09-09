'use client';

import React from 'react';
import './globals.css';
import Sidebar from '@/components/layout/Sidebar';
import Navbar from '@/components/layout/Navbar';
import GlobalAIAssistantModal from '@/components/ai/GlobalAIAssistantModal';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th">
      <head>
        <title>ระบบจัดการสินค้าและคลังสินค้า (Stock Management System)</title>
        <meta name="description" content="Production-Grade Inventory Management System with ACID Safety & Movements History" />
      </head>
      <body className="antialiased bg-slate-50 text-slate-900 flex min-h-screen">
        <RoleProvider>
          <Sidebar />
          <div className="flex-1 flex flex-col min-w-0 overflow-x-hidden">
            <Navbar />
            <main className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto">
              {children}
            </main>
          </div>
          <GlobalAIAssistantModal />
        </RoleProvider>
      </body>
    </html>
  );
}
