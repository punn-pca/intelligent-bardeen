'use client';

import React, { useState, useEffect } from 'react';
import { UserCheck, Plus, Search, Eye, Edit2, Trash2, CheckCircle2, AlertCircle, Building2, Phone, Mail, FileText } from 'lucide-react';
import { useRole } from '@/components/context/RoleContext';

export default function CustomersPage() {
  const { currentRole } = useRole();
  const [customers, setCustomers] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    contactPerson: '',
    email: '',
    phone: '',
    address: '',
    taxId: '',
  });

  // Corporate Tax ID Lookup state
  const [lookupTaxId, setLookupTaxId] = useState('');
  const [lookingUp, setLookingUp] = useState(false);
  const [lookupMsg, setLookupMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const canEdit = currentRole === 'ADMIN' || currentRole === 'MANAGER' || currentRole === 'ACCOUNTING';

  async function loadCustomers() {
    try {
      setLoading(true);
      const res = await fetch(`/api/customers?search=${encodeURIComponent(search)}`);
      const data = await res.json();
      setCustomers(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCustomers();
  }, [search]);

  const handleCorporateLookup = async () => {
    if (!lookupTaxId.trim()) {
      setErrorMsg('กรุณาป้อนเลขนิติบุคคล / เลขประจำตัวผู้เสียภาษี 13 หลัก');
      return;
    }

    try {
      setLookingUp(true);
      setErrorMsg('');
      setLookupMsg('');

      const res = await fetch(`/api/corporate-lookup?taxId=${encodeURIComponent(lookupTaxId.trim())}`);
      const result = await res.json();

      if (!res.ok || !result.found) {
        throw new Error(result.error || 'ไม่พบข้อมูลนิติบุคคลตามเลขภาษีที่ระบุ');
      }

      const corp = result.data;
      setFormData((prev) => ({
        ...prev,
        name: corp.name,
        taxId: corp.taxId,
        address: corp.address || prev.address,
        code: prev.code || `CUST-${corp.taxId.slice(-6)}`,
      }));

      setLookupMsg(`✓ ดึงข้อมูลนิติบุคคลสำเร็จ: ${corp.name}`);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLookingUp(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    try {
      const url = editingId ? `/api/customers/${editingId}` : '/api/customers';
      const method = editingId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': currentRole || 'ADMIN',
        },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save customer');

      setShowModal(false);
      setEditingId(null);
      setFormData({
        code: '',
        name: '',
        contactPerson: '',
        email: '',
        phone: '',
        address: '',
        taxId: '',
      });
      setLookupTaxId('');
      setLookupMsg('');
      await loadCustomers();
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <UserCheck className="w-7 h-7 text-blue-600" />
            <span>จัดการลูกค้า (Customer Management)</span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            ทะเบียนรายชื่อลูกค้า เลขประจำตัวผู้เสียภาษี ช่องทางติดต่อ ที่อยู่จัดส่ง และดึงข้อมูลอัตโนมัติจากเลขนิติบุคคล 13 หลัก
          </p>
        </div>

        {canEdit && (
          <button
            onClick={() => {
              setEditingId(null);
              setFormData({
                code: `CUST-${Date.now().toString().slice(-4)}`,
                name: '',
                contactPerson: '',
                email: '',
                phone: '',
                address: '',
                taxId: '',
              });
              setLookupTaxId('');
              setLookupMsg('');
              setErrorMsg('');
              setShowModal(true);
            }}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold flex items-center gap-2 shadow-xs transition-all shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>+ เพิ่มลูกค้าใหม่ (Add Customer)</span>
          </button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1 min-w-[260px]">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ค้นหาตามรหัสลูกค้า, ชื่อบริษัท, เลขผู้เสียภาษี, เบอร์โทรศัพท์..."
            className="w-full text-xs outline-none text-slate-800 font-mono placeholder-slate-400"
          />
        </div>
      </div>

      {/* Customers Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500 uppercase text-xs border-b border-slate-200">
              <tr>
                <th className="p-4">รหัสลูกค้า</th>
                <th className="p-4">ชื่อลูกค้า / นิติบุคคล</th>
                <th className="p-4">เลขประจำตัวผู้เสียภาษี</th>
                <th className="p-4">ผู้ติดต่อ</th>
                <th className="p-4">เบอร์โทร / อีเมล</th>
                <th className="p-4 text-center">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-slate-400">
                    กำลังโหลดข้อมูลลูกค้า...
                  </td>
                </tr>
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-slate-400">
                    ยังไม่มีข้อมูลลูกค้าในระบบ
                  </td>
                </tr>
              ) : (
                customers.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/80 transition-all">
                    <td className="p-4 font-mono font-bold text-blue-600 text-xs">{c.code}</td>
                    <td className="p-4 font-semibold text-slate-900 text-xs">
                      <p>{c.name}</p>
                      <p className="text-[10px] text-slate-400 font-normal truncate max-w-xs">{c.address || '-'}</p>
                    </td>
                    <td className="p-4 font-mono text-xs text-slate-700">{c.taxId || '-'}</td>
                    <td className="p-4 text-xs text-slate-700 font-medium">{c.contactPerson || '-'}</td>
                    <td className="p-4 text-xs text-slate-600">
                      <p>{c.phone || '-'}</p>
                      <p className="text-[10px] text-slate-400">{c.email || ''}</p>
                    </td>
                    <td className="p-4 text-center">
                      {canEdit && (
                        <button
                          onClick={() => {
                            setEditingId(c.id);
                            setFormData({
                              code: c.code,
                              name: c.name,
                              contactPerson: c.contactPerson || '',
                              email: c.email || '',
                              phone: c.phone || '',
                              address: c.address || '',
                              taxId: c.taxId || '',
                            });
                            setLookupTaxId(c.taxId || '');
                            setLookupMsg('');
                            setErrorMsg('');
                            setShowModal(true);
                          }}
                          className="p-1.5 text-slate-500 hover:text-blue-600 inline-block transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Customer Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-xl p-6 space-y-4">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
              <UserCheck className="w-5 h-5 text-blue-600" />
              <span>{editingId ? 'แก้ไขข้อมูลลูกค้า' : 'เพิ่มลูกค้าใหม่'}</span>
            </h3>

            {errorMsg && (
              <div className="bg-rose-50 border border-rose-200 text-rose-700 p-3 rounded-lg text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Corporate Tax ID Quick Lookup Bar */}
            <div className="bg-blue-50/70 border border-blue-200 p-3.5 rounded-xl space-y-2">
              <label className="block text-xs font-bold text-blue-900 flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-blue-600" />
                <span>ดึงข้อมูลอัตโนมัติจากเลขนิติบุคคล (Corporate Tax ID Lookup)</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={lookupTaxId}
                  onChange={(e) => setLookupTaxId(e.target.value)}
                  placeholder="ป้อน/วาง เลขนิติบุคคล 13 หลัก (เช่น 0105555081714)..."
                  className="flex-1 px-3 py-2 bg-white border border-blue-300 rounded-lg text-xs font-mono text-slate-900 outline-none focus:border-blue-600"
                />
                <button
                  type="button"
                  onClick={handleCorporateLookup}
                  disabled={lookingUp}
                  className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-2xs transition-all shrink-0 flex items-center gap-1"
                >
                  <Search className="w-3.5 h-3.5" />
                  <span>{lookingUp ? 'กำลังดึงข้อมูล...' : '🔍 ดึงข้อมูลนิติบุคคล'}</span>
                </button>
              </div>

              {lookupMsg && (
                <p className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                  <span>{lookupMsg}</span>
                </p>
              )}
            </div>

            <form onSubmit={handleSubmit} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">รหัสลูกค้า *</label>
                  <input
                    type="text"
                    required
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:border-blue-500 font-mono font-bold text-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">เลขประจำตัวผู้เสียภาษี (Tax ID)</label>
                  <input
                    type="text"
                    value={formData.taxId}
                    onChange={(e) => setFormData({ ...formData, taxId: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:border-blue-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">ชื่อลูกค้า / นิติบุคคล *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:border-blue-500 font-semibold text-slate-900"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">ผู้ติดต่อ</label>
                  <input
                    type="text"
                    value={formData.contactPerson}
                    onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">เบอร์โทรศัพท์</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">อีเมล</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">ที่อยู่จดทะเบียนนิติบุคคล / ที่อยู่จัดส่ง</label>
                <textarea
                  rows={2}
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-slate-600 font-semibold"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold shadow-2xs"
                >
                  {editingId ? 'บันทึกการแก้ไข' : 'บันทึกลูกค้า'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
