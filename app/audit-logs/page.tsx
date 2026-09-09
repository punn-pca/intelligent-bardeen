'use client';

import React, { useState, useEffect } from 'react';
import { ShieldAlert, Search, Eye } from 'lucide-react';
import { useRole } from '@/components/context/RoleContext';

export default function AuditLogsPage() {
  const { currentRole } = useRole();
  const [logs, setLogs] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState<any>(null);

  async function loadLogs() {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.append('search', search);

      const res = await fetch(`/api/audit-logs?${params.toString()}`);
      const data = await res.json();
      setLogs(data.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadLogs();
  }, [search]);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="border-b border-slate-200 pb-5">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <ShieldAlert className="w-7 h-7 text-amber-600" />
          <span>Audit Logs (บันทึกการทำงานของระบบ)</span>
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          บันทึกการกระทำสำคัญทั้งหมด (User, Action, Entity, Before/After Data, Timestamp, IP) ห้ามแก้ไขย้อนหลังโดยผู้ใช้ทั่วไป
        </p>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
        <Search className="w-4 h-4 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="ค้นหา User, Action (เช่น STOCK_ADJUSTMENT), Entity..."
          className="w-full text-sm outline-none text-slate-800 placeholder-slate-400 font-mono"
        />
      </div>

      {/* Audit Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500 uppercase text-xs border-b border-slate-200">
              <tr>
                <th className="p-4">วัน-เวลา</th>
                <th className="p-4">ผู้ใช้งาน</th>
                <th className="p-4">Action</th>
                <th className="p-4">Entity</th>
                <th className="p-4">Entity ID</th>
                <th className="p-4">IP Address</th>
                <th className="p-4 text-center">ดู Data</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-slate-400">
                    กำลังโหลด Audit Logs...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-slate-400">
                    ไม่พบรายการ Audit Logs
                  </td>
                </tr>
              ) : (
                logs.map((log) => {
                  const dateStr = new Date(log.createdAt).toLocaleString('th-TH');

                  return (
                    <tr key={log.id} className="hover:bg-slate-50/80 transition-all text-xs">
                      <td className="p-4 text-slate-500 font-mono whitespace-nowrap">{dateStr}</td>
                      <td className="p-4 font-semibold text-slate-800">{log.username}</td>
                      <td className="p-4">
                        <span className="bg-slate-100 text-slate-800 font-mono font-bold px-2 py-0.5 rounded border border-slate-200">
                          {log.action}
                        </span>
                      </td>
                      <td className="p-4 text-slate-600 font-semibold">{log.entity}</td>
                      <td className="p-4 font-mono text-slate-500">{log.entityId || '-'}</td>
                      <td className="p-4 font-mono text-slate-400">{log.ipAddress || '127.0.0.1'}</td>
                      <td className="p-4 text-center">
                        <button
                          onClick={() => setSelectedLog(log)}
                          className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-slate-100 rounded transition-all"
                          title="ดูข้อมูล Before/After"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Log Detail Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-100">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <h3 className="font-semibold text-base font-mono">Audit Detail ({selectedLog.action})</h3>
              <button onClick={() => setSelectedLog(null)} className="text-slate-400 hover:text-white">
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs font-mono">
              <div>
                <p className="text-slate-400 font-sans font-semibold uppercase mb-1">Before Data:</p>
                <pre className="bg-slate-900 text-slate-200 p-3 rounded-lg overflow-x-auto">
                  {selectedLog.beforeData ? JSON.stringify(JSON.parse(selectedLog.beforeData), null, 2) : 'null'}
                </pre>
              </div>

              <div>
                <p className="text-slate-400 font-sans font-semibold uppercase mb-1">After Data:</p>
                <pre className="bg-slate-900 text-emerald-400 p-3 rounded-lg overflow-x-auto">
                  {selectedLog.afterData ? JSON.stringify(JSON.parse(selectedLog.afterData), null, 2) : 'null'}
                </pre>
              </div>
            </div>

            <div className="bg-slate-50 px-6 py-3 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 bg-slate-800 text-white rounded-lg text-xs font-sans font-semibold"
              >
                ปิด
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
