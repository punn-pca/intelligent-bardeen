'use client';

import React, { useState, useEffect } from 'react';
import { Warehouse, Plus, MapPin, UserCheck, AlertCircle, Edit, Trash2 } from 'lucide-react';
import { useRole } from '@/components/context/RoleContext';

export default function WarehousesPage() {
  const { currentRole } = useRole();
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Add Warehouse State
  const [showAddModal, setShowAddModal] = useState(false);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [managerName, setManagerName] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Edit Warehouse State
  const [editingWarehouse, setEditingWarehouse] = useState<any | null>(null);
  const [editCode, setEditCode] = useState('');
  const [editName, setEditName] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editManagerName, setEditManagerName] = useState('');
  const [editErrorMsg, setEditErrorMsg] = useState('');

  // Delete Warehouse State
  const [deletingWarehouse, setDeletingWarehouse] = useState<any | null>(null);
  const [deleting, setDeleting] = useState(false);

  const canManage = currentRole === 'ADMIN' || currentRole === 'MANAGER';

  async function loadWarehouses() {
    try {
      setLoading(true);
      const res = await fetch('/api/warehouses');
      const data = await res.json();
      setWarehouses(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadWarehouses();
  }, []);

  const handleCreateWarehouse = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    try {
      const res = await fetch('/api/warehouses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': currentRole || 'ADMIN',
        },
        body: JSON.stringify({ code, name, address, managerName }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to create warehouse');
      }

      setShowAddModal(false);
      setCode('');
      setName('');
      setAddress('');
      setManagerName('');
      loadWarehouses();
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const openEditModal = (wh: any) => {
    setEditingWarehouse(wh);
    setEditCode(wh.code);
    setEditName(wh.name);
    setEditAddress(wh.address || '');
    setEditManagerName(wh.managerName || '');
    setEditErrorMsg('');
  };

  const handleUpdateWarehouse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingWarehouse) return;
    setEditErrorMsg('');

    try {
      const res = await fetch(`/api/warehouses/${editingWarehouse.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': currentRole || 'ADMIN',
        },
        body: JSON.stringify({
          code: editCode,
          name: editName,
          address: editAddress,
          managerName: editManagerName,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to update warehouse');
      }

      setEditingWarehouse(null);
      loadWarehouses();
    } catch (err: any) {
      setEditErrorMsg(err.message);
    }
  };

  const handleDeleteWarehouse = async () => {
    if (!deletingWarehouse) return;

    try {
      setDeleting(true);
      const res = await fetch(`/api/warehouses/${deletingWarehouse.id}`, {
        method: 'DELETE',
        headers: {
          'x-user-role': currentRole || 'ADMIN',
        },
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to delete warehouse');
      }

      setDeletingWarehouse(null);
      loadWarehouses();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex items-center justify-between border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Warehouse className="w-7 h-7 text-emerald-600" />
            <span>จัดการคลังสินค้า (Warehouse Management)</span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">รองรับหลายคลังสินค้า (Multi-Warehouse) เพิ่มคลังใหม่ แก้ไขข้อมูลคลังสินค้า ลบคลังสินค้า และผู้รับผิดชอบ</p>
        </div>

        {canManage && (
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold flex items-center gap-2 shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>+ เพิ่มคลังสินค้าใหม่</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {loading ? (
          <div className="col-span-full py-8 text-center text-slate-400">กำลังโหลดรายการคลังสินค้า...</div>
        ) : (
          warehouses.map((wh) => (
            <div key={wh.id} className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4 relative group">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-slate-900 text-emerald-400 rounded-xl flex items-center justify-center font-mono font-bold text-base shadow-sm">
                    {wh.code}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-lg">{wh.name}</h3>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded border ${wh.active !== false ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                      {wh.active !== false ? 'ACTIVE' : 'INACTIVE'}
                    </span>
                  </div>
                </div>

                {canManage && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => openEditModal(wh)}
                      className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors flex items-center gap-1 text-xs font-medium border border-slate-200"
                      title="แก้ไขคลังสินค้า"
                    >
                      <Edit className="w-4 h-4" />
                      <span>แก้ไข</span>
                    </button>

                    <button
                      onClick={() => setDeletingWarehouse(wh)}
                      className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors flex items-center gap-1 text-xs font-medium border border-slate-200"
                      title="ลบคลังสินค้า"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>ลบ</span>
                    </button>
                  </div>
                )}
              </div>

              <div className="space-y-2 text-sm text-slate-600">
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                  <span>{wh.address || 'ไม่ได้ระบุที่อยู่'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-slate-400 shrink-0" />
                  <span>ผู้รับผิดชอบ: <strong className="text-slate-800">{wh.managerName || 'ไม่ได้ระบุ'}</strong></span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-100">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <h3 className="font-semibold text-lg">เพิ่มคลังสินค้าใหม่</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white">
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateWarehouse} className="p-6 space-y-4">
              {errorMsg && (
                <div className="bg-rose-50 border border-rose-200 text-rose-700 p-3 rounded-lg text-sm flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">รหัสคลัง (Warehouse Code) *</label>
                <input
                  type="text"
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="เช่น BRANCH-01"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none font-mono uppercase focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">ชื่อคลังสินค้า *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="เช่น คลังสินค้าสาขาปิ่นเกล้า"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">ผู้รับผิดชอบคลัง</label>
                <input
                  type="text"
                  value={managerName}
                  onChange={(e) => setManagerName(e.target.value)}
                  placeholder="เช่น นายสมชาย สายตรง"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">ที่อยู่คลังสินค้า</label>
                <textarea
                  rows={2}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="ที่ตั้งคลังสินค้า..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:border-emerald-500"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold shadow-xs"
                >
                  บันทึกคลังสินค้า
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingWarehouse && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-100">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <Edit className="w-5 h-5 text-emerald-400" />
                <span>แก้ไขข้อมูลคลังสินค้า</span>
              </h3>
              <button onClick={() => setEditingWarehouse(null)} className="text-slate-400 hover:text-white">
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateWarehouse} className="p-6 space-y-4">
              {editErrorMsg && (
                <div className="bg-rose-50 border border-rose-200 text-rose-700 p-3 rounded-lg text-sm flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{editErrorMsg}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">รหัสคลัง (Warehouse Code) *</label>
                <input
                  type="text"
                  required
                  value={editCode}
                  onChange={(e) => setEditCode(e.target.value.toUpperCase())}
                  placeholder="เช่น MAIN"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none font-mono uppercase focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">ชื่อคลังสินค้า *</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="ชื่อคลังสินค้า..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">ผู้รับผิดชอบคลัง</label>
                <input
                  type="text"
                  value={editManagerName}
                  onChange={(e) => setEditManagerName(e.target.value)}
                  placeholder="ชื่อผู้รับผิดชอบคลัง..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">ที่อยู่คลังสินค้า</label>
                <textarea
                  rows={2}
                  value={editAddress}
                  onChange={(e) => setEditAddress(e.target.value)}
                  placeholder="ที่ตั้งคลังสินค้า..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:border-emerald-500"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => {
                    const wh = editingWarehouse;
                    setEditingWarehouse(null);
                    setDeletingWarehouse(wh);
                  }}
                  className="px-3 py-2 text-rose-600 hover:bg-rose-50 rounded-lg text-xs font-bold flex items-center gap-1 border border-rose-200"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>ลบคลังสินค้านี้</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingWarehouse(null)}
                    className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold shadow-xs"
                  >
                    บันทึกการแก้ไข
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingWarehouse && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4 border border-slate-100">
            <div className="flex items-center gap-3 text-rose-600 border-b border-slate-100 pb-3">
              <AlertCircle className="w-6 h-6 shrink-0" />
              <h3 className="font-bold text-lg text-slate-900">ยืนยันการลบคลังสินค้า</h3>
            </div>

            <p className="text-sm text-slate-600 leading-relaxed">
              คุณต้องการลบคลังสินค้า <strong className="text-slate-900">[{deletingWarehouse.code}] {deletingWarehouse.name}</strong> ใช่หรือไม่?
            </p>
            <p className="text-xs text-slate-500 bg-slate-50 p-3 rounded-lg border border-slate-200">
              * ระบบจะทำการปิดสถานะ (Deactivate) คลังสินค้านี้เพื่อรักษาสภาพข้อมูลย้อนหลัง และซ่อนคลังสินค้าจากการใช้งานใหม่
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeletingWarehouse(null)}
                className="px-4 py-2 border border-slate-300 text-slate-600 rounded-xl text-sm font-semibold hover:bg-slate-50"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleDeleteWarehouse}
                disabled={deleting}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-sm font-bold shadow-xs flex items-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                <span>{deleting ? 'กำลังลบ...' : 'ยืนยันลบคลังสินค้า'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
