'use client';

import React, { useState, useEffect } from 'react';
import { FolderTree, Plus, Tag, AlertCircle, Edit2, Trash2, CheckCircle2 } from 'lucide-react';
import { useRole } from '@/components/context/RoleContext';

export default function CategoriesPage() {
  const { currentRole } = useRole();
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Add Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Edit Modal State
  const [showEditModal, setShowEditModal] = useState(false);
  const [editId, setEditId] = useState('');
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editErrorMsg, setEditErrorMsg] = useState('');

  // Delete Modal State
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [deleteErrorMsg, setDeleteErrorMsg] = useState('');

  const canManage = currentRole === 'ADMIN' || currentRole === 'MANAGER';

  async function loadCategories() {
    try {
      setLoading(true);
      const res = await fetch('/api/categories');
      const data = await res.json();
      setCategories(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCategories();
  }, []);

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    try {
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': currentRole || 'ADMIN',
        },
        body: JSON.stringify({ name, description }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to create category');
      }

      setShowAddModal(false);
      setName('');
      setDescription('');
      loadCategories();
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const openEditModal = (cat: any) => {
    setEditId(cat.id);
    setEditName(cat.name);
    setEditDescription(cat.description || '');
    setEditErrorMsg('');
    setShowEditModal(true);
  };

  const handleUpdateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditErrorMsg('');

    try {
      const res = await fetch(`/api/categories/${editId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': currentRole || 'ADMIN',
        },
        body: JSON.stringify({ name: editName, description: editDescription }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to update category');
      }

      setShowEditModal(false);
      loadCategories();
    } catch (err: any) {
      setEditErrorMsg(err.message);
    }
  };

  const openDeleteModal = (cat: any) => {
    setDeleteTarget(cat);
    setDeleteErrorMsg('');
    setShowDeleteModal(true);
  };

  const handleDeleteCategory = async () => {
    if (!deleteTarget) return;
    setDeleteErrorMsg('');

    try {
      const res = await fetch(`/api/categories/${deleteTarget.id}`, {
        method: 'DELETE',
        headers: {
          'x-user-role': currentRole || 'ADMIN',
        },
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to delete category');
      }

      setShowDeleteModal(false);
      setDeleteTarget(null);
      loadCategories();
    } catch (err: any) {
      setDeleteErrorMsg(err.message);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex items-center justify-between border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <FolderTree className="w-7 h-7 text-emerald-600" />
            <span>หมวดหมู่สินค้า (Category Management)</span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">จัดการหมวดหมู่สินค้า เพิ่ม แก้ไข ลบ และดูจำนวนสินค้าในแต่ละหมวดหมู่</p>
        </div>

        {canManage && (
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold flex items-center gap-2 shadow-xs transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>+ เพิ่มหมวดหมู่ใหม่</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full py-8 text-center text-slate-400">กำลังโหลดหมวดหมู่สินค้า...</div>
        ) : (
          categories.map((cat) => (
            <div key={cat.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3 flex flex-col justify-between hover:border-slate-300 transition-all">
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center font-bold shrink-0">
                      <Tag className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-800 text-base leading-snug">{cat.name}</h3>
                    </div>
                  </div>

                  <span className="bg-slate-100 text-slate-700 font-semibold px-2.5 py-1 rounded text-xs shrink-0">
                    {cat.productCount} สินค้า
                  </span>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed line-clamp-2">{cat.description || 'ไม่มีคำอธิบาย'}</p>
              </div>

              {canManage && (
                <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2 text-xs">
                  <button
                    onClick={() => openEditModal(cat)}
                    className="px-3 py-1.5 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 font-semibold flex items-center gap-1"
                  >
                    <Edit2 className="w-3.5 h-3.5 text-blue-600" />
                    <span>แก้ไข</span>
                  </button>
                  <button
                    onClick={() => openDeleteModal(cat)}
                    className="px-3 py-1.5 border border-rose-200 text-rose-600 hover:bg-rose-50 rounded-lg font-semibold flex items-center gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>ลบ</span>
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-100">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <h3 className="font-semibold text-base">เพิ่มหมวดหมู่สินค้าใหม่</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white text-lg">
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateCategory} className="p-6 space-y-4 text-xs">
              {errorMsg && (
                <div className="bg-rose-50 border border-rose-200 text-rose-700 p-3 rounded-lg flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div>
                <label className="block font-semibold text-slate-700 mb-1">ชื่อหมวดหมู่ *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="เช่น อุปกรณ์เครือข่าย"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:border-emerald-500 font-medium"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">รายละเอียดคำอธิบาย</label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="คำอธิบายหมวดหมู่สินค้าเพิ่มเติม..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:border-emerald-500"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-semibold"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold shadow-xs flex items-center gap-1"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>บันทึกหมวดหมู่</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-100">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <h3 className="font-semibold text-base">แก้ไขหมวดหมู่สินค้า</h3>
              <button onClick={() => setShowEditModal(false)} className="text-slate-400 hover:text-white text-lg">
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateCategory} className="p-6 space-y-4 text-xs">
              {editErrorMsg && (
                <div className="bg-rose-50 border border-rose-200 text-rose-700 p-3 rounded-lg flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{editErrorMsg}</span>
                </div>
              )}

              <div>
                <label className="block font-semibold text-slate-700 mb-1">ชื่อหมวดหมู่ *</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:border-emerald-500 font-bold"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">รายละเอียดคำอธิบาย</label>
                <textarea
                  rows={3}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:border-emerald-500"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-semibold"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold shadow-xs flex items-center gap-1"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>บันทึกการแก้ไข</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {showDeleteModal && deleteTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-100">
            <div className="bg-rose-600 text-white px-6 py-4 flex items-center justify-between">
              <h3 className="font-semibold text-base flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                <span>ยืนยันการลบหมวดหมู่สินค้า</span>
              </h3>
              <button onClick={() => setShowDeleteModal(false)} className="text-white/80 hover:text-white text-lg font-bold">
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              {deleteErrorMsg && (
                <div className="bg-rose-50 border border-rose-200 text-rose-700 p-3 rounded-lg flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{deleteErrorMsg}</span>
                </div>
              )}

              <p className="text-slate-700 font-medium">
                คุณแน่ใจหรือไม่ว่าต้องการลบหมวดหมู่ <strong className="text-slate-900 font-bold">{deleteTarget.name}</strong>?
              </p>

              {deleteTarget.productCount > 0 && (
                <div className="bg-amber-50 border border-amber-200 text-amber-800 p-3 rounded-lg text-xs leading-relaxed">
                  ⚠️ หมวดหมู่นี้มีสินค้าผูกอยู่ <strong>{deleteTarget.productCount} รายการ</strong> สินค้าเหล่านี้จะถูกย้ายไปยังหมวดหมู่สำรองโดยอัตโนมัติ
                </div>
              )}

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowDeleteModal(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-600 hover:bg-slate-50 rounded-lg font-semibold"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  onClick={handleDeleteCategory}
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold shadow-xs flex items-center gap-1"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>ยืนยันลบหมวดหมู่</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
