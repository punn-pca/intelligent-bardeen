'use client';

import React, { useState, useEffect } from 'react';
import { Users, Shield, Plus, CheckCircle, AlertCircle } from 'lucide-react';
import { useRole } from '@/components/context/RoleContext';

export default function UsersPage() {
  const { currentRole } = useRole();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [username, setUsername] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('STAFF');
  const [errorMsg, setErrorMsg] = useState('');

  const isAdmin = currentRole === 'ADMIN';

  async function loadUsers() {
    try {
      setLoading(true);
      const res = await fetch('/api/users', {
        headers: { 'x-user-role': currentRole || 'ADMIN' },
      });
      const data = await res.json();
      setUsers(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadUsers();
  }, [currentRole]);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': currentRole || 'ADMIN',
        },
        body: JSON.stringify({ username, password, name, role }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to create user');
      }

      setShowAddModal(false);
      setUsername('');
      setName('');
      setPassword('');
      setRole('STAFF');
      loadUsers();
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <Users className="w-7 h-7 text-emerald-600 dark:text-emerald-400" />
            <span>จัดการผู้ใช้งานและสิทธิ์ (User & RBAC Permissions)</span>
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">บทบาท: ADMIN (สิทธิ์ทั้งหมด), MANAGER (จัดการคลัง/รายงาน), STAFF (รับ/เบิกสต็อก), VIEWER (ดูอย่างเดียว)</p>
        </div>

        {isAdmin && (
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold flex items-center gap-2 shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>+ เพิ่มผู้ใช้งานใหม่</span>
          </button>
        )}
      </div>

      {/* Role Matrix Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { role: 'ADMIN', color: 'rose', desc: 'ทุกสิทธิ์ในระบบ (Full Access)' },
          { role: 'MANAGER', color: 'amber', desc: 'จัดการสินค้า คลัง สต็อก ปรับยอด รายงาน' },
          { role: 'STAFF', color: 'emerald', desc: 'รับสินค้าเข้า เบิกสินค้าออก ดูสต็อก' },
          { role: 'VIEWER', color: 'blue', desc: 'ดูข้อมูลและรายงานได้อย่างเดียว' },
        ].map((item) => (
          <div key={item.role} className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-slate-400 dark:text-slate-500" />
              <span className="font-bold text-slate-800 dark:text-slate-200 text-sm">{item.role}</span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">{item.desc}</p>
          </div>
        ))}
      </div>

      {/* Users Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 uppercase text-xs border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="p-4">Username</th>
                <th className="p-4">ชื่อ-นามสกุล</th>
                <th className="p-4">บทบาท (Role)</th>
                <th className="p-4">สถานะ</th>
                <th className="p-4">วันที่สร้าง</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-slate-400 dark:text-slate-500">
                    กำลังโหลดผู้ใช้งาน...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-slate-400 dark:text-slate-500">
                    ไม่มีสิทธิ์เข้าถึง หรือไม่พบผู้ใช้งาน
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-all">
                    <td className="p-4 font-mono font-semibold text-slate-900 dark:text-white">{u.username}</td>
                    <td className="p-4 font-medium text-slate-800 dark:text-slate-200">{u.name}</td>
                    <td className="p-4">
                      <span
                        className={`px-2.5 py-1 rounded text-xs font-semibold border ${
                          u.role === 'ADMIN'
                            ? 'bg-rose-50 dark:bg-rose-950/80 text-rose-600 dark:text-rose-300 border-rose-200 dark:border-rose-800'
                            : u.role === 'MANAGER'
                            ? 'bg-amber-50 dark:bg-amber-950/80 text-amber-600 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                            : u.role === 'STAFF'
                            ? 'bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                            : 'bg-blue-50 dark:bg-blue-950/80 text-blue-600 dark:text-blue-300 border-blue-200 dark:border-blue-800'
                        }`}
                      >
                        {u.role}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className="bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs px-2 py-0.5 rounded font-semibold">
                        ACTIVE
                      </span>
                    </td>
                    <td className="p-4 text-xs text-slate-500 dark:text-slate-400">
                      {new Date(u.createdAt).toLocaleDateString('th-TH')}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-100 dark:border-slate-800">
            <div className="bg-slate-900 dark:bg-slate-950 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800">
              <h3 className="font-semibold text-lg">เพิ่มผู้ใช้งานใหม่</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white">
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="p-6 space-y-4">
              {errorMsg && (
                <div className="bg-rose-50 dark:bg-rose-950/80 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 p-3 rounded-lg text-sm flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Username *</label>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="เช่น john_doe"
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 outline-none font-mono focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">ชื่อ-นามสกุล *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="เช่น สมชาย ใจดี"
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Password *</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 outline-none font-mono focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">บทบาท (Role) *</label>
                <select
                  required
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-emerald-500"
                >
                  <option value="STAFF">STAFF (พนักงานคลัง)</option>
                  <option value="MANAGER">MANAGER (ผู้จัดการ)</option>
                  <option value="ADMIN">ADMIN (ผู้ดูแลระบบ)</option>
                  <option value="VIEWER">VIEWER (ผู้รับชม)</option>
                </select>
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-sm"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold shadow-xs"
                >
                  บันทึกผู้ใช้งาน
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
