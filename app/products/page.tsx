'use client';

import React, { useState, useEffect } from 'react';
import { Package, Plus, Search, Filter, Eye, Edit2, Trash2, CheckCircle2, AlertCircle, ShieldAlert } from 'lucide-react';
import Link from 'next/link';
import { useRole } from '@/components/context/RoleContext';

export default function ProductsPage() {
  const { currentRole } = useRole();
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [loading, setLoading] = useState(true);

  // Modal State: Create
  const [showAddModal, setShowAddModal] = useState(false);

  // Modal State: Edit (ADMIN ONLY)
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Modal State: Delete (ADMIN ONLY)
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingProduct, setDeletingProduct] = useState<any | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [formData, setFormData] = useState({
    sku: '',
    barcode: '',
    name: '',
    description: '',
    categoryId: '',
    unit: 'ชิ้น',
    costPrice: '0',
    sellingPrice: '0',
    minStock: '5',
    maxStock: '100',
  });

  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // STRICT RULE: Only ADMIN can edit or delete products
  const isAdmin = currentRole === 'ADMIN';
  const canCreate = currentRole === 'ADMIN' || currentRole === 'MANAGER';

  async function loadData() {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams();
      queryParams.append('limit', '2000');
      if (search) queryParams.append('search', search);
      if (selectedCategory) queryParams.append('categoryId', selectedCategory);
      if (selectedStatus) queryParams.append('status', selectedStatus);

      const [prodRes, catRes] = await Promise.all([
        fetch(`/api/products?${queryParams.toString()}`),
        fetch('/api/categories'),
      ]);

      const prodData = await prodRes.json();
      const catData = await catRes.json();

      setProducts(prodData.data || []);
      setCategories(catData || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [search, selectedCategory, selectedStatus]);

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': currentRole || 'ADMIN',
        },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create product');

      setSuccessMsg('เพิ่มสินค้าใหม่เรียบร้อยแล้ว!');
      setShowAddModal(false);
      await loadData();
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const handleOpenEditModal = (product: any) => {
    if (!isAdmin) {
      setErrorMsg('สิทธิ์ไม่ถูกต้อง: เฉพาะสิทธิ์ ADMIN เท่านั้นที่สามารถแก้ไขข้อมูลสินค้าได้');
      return;
    }

    setEditingId(product.id);
    setFormData({
      sku: product.sku || '',
      barcode: product.barcode || '',
      name: product.name || '',
      description: product.description || '',
      categoryId: product.categoryId || (categories[0]?.id || ''),
      unit: product.unit || 'ชิ้น',
      costPrice: (product.costPrice || 0).toString(),
      sellingPrice: (product.sellingPrice || 0).toString(),
      minStock: (product.minStock || 5).toString(),
      maxStock: (product.maxStock || 100).toString(),
    });
    setErrorMsg('');
    setShowEditModal(true);
  };

  const handleUpdateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId) return;
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await fetch(`/api/products/${editingId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': currentRole || 'ADMIN',
        },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update product');

      setSuccessMsg(`แก้ไขข้อมูลสินค้า [${data.sku}] เรียบร้อยแล้ว!`);
      setShowEditModal(false);
      setEditingId(null);
      await loadData();
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const handleOpenDeleteModal = (product: any) => {
    if (!isAdmin) {
      setErrorMsg('สิทธิ์ไม่ถูกต้อง: เฉพาะสิทธิ์ ADMIN เท่านั้นที่สามารถลบสินค้าได้');
      return;
    }
    setDeletingProduct(product);
    setErrorMsg('');
    setShowDeleteModal(true);
  };

  const handleDeleteProduct = async () => {
    if (!deletingProduct) return;
    setErrorMsg('');
    setSuccessMsg('');

    try {
      setDeleting(true);
      const res = await fetch(`/api/products/${deletingProduct.id}`, {
        method: 'DELETE',
        headers: {
          'x-user-role': currentRole || 'ADMIN',
        },
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete product');

      setSuccessMsg(`ลบสินค้า [${deletingProduct.sku}] ${deletingProduct.name} เรียบร้อยแล้ว!`);
      setShowDeleteModal(false);
      setDeletingProduct(null);
      await loadData();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setDeleting(false);
    }
  };

  const [selectedGroup, setSelectedGroup] = useState<'ALL' | 'FINISHED_GOODS' | 'SPARE_PARTS'>('ALL');

  const filteredProducts = products.filter((p) => {
    const isFinished = p.category?.name?.startsWith('สินค้าสำเร็จรูป');
    if (selectedGroup === 'FINISHED_GOODS') return isFinished;
    if (selectedGroup === 'SPARE_PARTS') return !isFinished;
    return true;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <Package className="w-7 h-7 text-blue-600 dark:text-blue-400" />
            <span>แคตตาล็อกสินค้าและอะไหล่ ({filteredProducts.length.toLocaleString()} รายการ)</span>
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            แยกประเภทสินค้าสำเร็จรูปทั้งเครื่อง (เครื่องซักผ้า, ตู้น้ำ, ตู้เติมเงิน) และอะไหล่ชิ้นส่วนอิเล็กทรอนิกส์ <span className="font-bold text-blue-600 dark:text-blue-400">(สิทธิ์แก้ไข/ลบ: เฉพาะ ADMIN)</span>
          </p>
        </div>

        {canCreate && (
          <button
            onClick={() => {
              if (categories.length > 0) {
                setFormData((prev) => ({ ...prev, categoryId: categories[0].id }));
              }
              setErrorMsg('');
              setShowAddModal(true);
            }}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold flex items-center gap-2 shadow-xs transition-all shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>+ เพิ่มสินค้าใหม่ (Add Product)</span>
          </button>
        )}
      </div>

      {successMsg && (
        <div className="bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 p-3.5 rounded-xl text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 p-3.5 rounded-xl text-xs font-bold flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Quick Group Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        <button
          onClick={() => setSelectedGroup('ALL')}
          className={`px-4 py-2 text-xs font-extrabold rounded-xl transition-all ${
            selectedGroup === 'ALL'
              ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-sm'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
          }`}
        >
          รายการทั้งหมด ({products.length})
        </button>

        <button
          onClick={() => setSelectedGroup('FINISHED_GOODS')}
          className={`px-4 py-2 text-xs font-extrabold rounded-xl transition-all flex items-center gap-1.5 ${
            selectedGroup === 'FINISHED_GOODS'
              ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/30'
              : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100'
          }`}
        >
          <span>🏭 สินค้าสำเร็จรูปทั้งเครื่อง</span>
          <span className="px-1.5 py-0.5 rounded-full bg-white/20 text-[10px]">
            {products.filter((p) => p.category?.name?.startsWith('สินค้าสำเร็จรูป')).length}
          </span>
        </button>

        <button
          onClick={() => setSelectedGroup('SPARE_PARTS')}
          className={`px-4 py-2 text-xs font-extrabold rounded-xl transition-all flex items-center gap-1.5 ${
            selectedGroup === 'SPARE_PARTS'
              ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/30'
              : 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 hover:bg-blue-100'
          }`}
        >
          <span>⚙️ อะไหล่และชิ้นส่วน</span>
          <span className="px-1.5 py-0.5 rounded-full bg-white/20 text-[10px]">
            {products.filter((p) => !p.category?.name?.startsWith('สินค้าสำเร็จรูป')).length}
          </span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800/80 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1 min-w-[260px]">
          <Search className="w-4 h-4 text-slate-400 dark:text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ค้นหา SKU, บาร์โค้ด หรือชื่อสินค้า (จาก 1,600+ รายการ)..."
            className="w-full text-xs outline-none text-slate-800 dark:text-slate-100 font-mono placeholder-slate-400 dark:placeholder-slate-500 bg-transparent"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-xs">
            <Filter className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
            <span className="font-semibold text-slate-600 dark:text-slate-400">หมวดหมู่:</span>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-1.5 border border-slate-300 dark:border-slate-700 rounded-lg text-xs outline-none bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-medium"
            >
              <option value="">ทั้งหมด</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="font-semibold text-slate-600 dark:text-slate-400">สถานะสต็อก:</span>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-3 py-1.5 border border-slate-300 dark:border-slate-700 rounded-lg text-xs outline-none bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-medium"
            >
              <option value="">ทั้งหมด</option>
              <option value="active">เปิดใช้งาน (Active)</option>
              <option value="low_stock">ใกล้หมด (Low Stock)</option>
              <option value="out_of_stock">หมดสต็อก (Out of Stock)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 uppercase text-xs border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="p-4">SKU / บาร์โค้ด</th>
                <th className="p-4">ชื่อสินค้า</th>
                <th className="p-4">หมวดหมู่</th>
                <th className="p-4 text-right">สต็อกคงเหลือรวม</th>
                <th className="p-4 text-center">หน่วย</th>
                <th className="p-4 text-center">สถานะ</th>
                <th className="p-4 text-center">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-slate-400 dark:text-slate-500">
                    กำลังโหลดแคตตาล็อกสินค้า...
                  </td>
                </tr>
              ) : filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-slate-400 dark:text-slate-500">
                    ไม่พบข้อมูลสินค้าตรงตามเงื่อนไข
                  </td>
                </tr>
              ) : (
                filteredProducts.map((product) => (
                  <tr key={product.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-all">
                    <td className="p-4 font-mono font-bold text-blue-600 dark:text-blue-400 text-xs">
                      <p>{product.sku}</p>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500">{product.barcode}</p>
                    </td>
                    <td className="p-4 font-semibold text-slate-800 dark:text-slate-200 text-xs">{product.name}</td>
                    <td className="p-4 text-xs text-slate-500 dark:text-slate-400">{product.category?.name || '-'}</td>
                    <td className="p-4 text-right font-mono font-bold text-xs text-slate-900 dark:text-white">
                      {product.totalOnHand?.toLocaleString()}
                    </td>
                    <td className="p-4 text-center text-xs text-slate-500 dark:text-slate-400">{product.unit}</td>
                    <td className="p-4 text-center">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          product.stockStatus === 'OUT_OF_STOCK'
                            ? 'bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                            : product.stockStatus === 'LOW_STOCK'
                            ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                            : 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                        }`}
                      >
                        {product.stockStatus === 'OUT_OF_STOCK'
                          ? 'หมดสต็อก'
                          : product.stockStatus === 'LOW_STOCK'
                          ? 'ใกล้หมด'
                          : 'ปกติ'}
                      </span>
                    </td>
                    <td className="p-4 text-center space-x-1">
                      <Link
                        href={`/products/${product.id}`}
                        className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 inline-block transition-colors"
                        title="ดูรายละเอียดสินค้า"
                      >
                        <Eye className="w-4 h-4" />
                      </Link>

                      {/* EDIT BUTTON: Displayed ONLY for ADMIN role */}
                      {isAdmin && (
                        <button
                          onClick={() => handleOpenEditModal(product)}
                          className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 inline-block transition-colors"
                          title="แก้ไขข้อมูลสินค้า (ADMIN Only)"
                        >
                          <Edit2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                        </button>
                      )}

                      {/* DELETE BUTTON: Displayed ONLY for ADMIN role */}
                      {isAdmin && (
                        <button
                          onClick={() => handleOpenDeleteModal(product)}
                          className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 inline-block transition-colors"
                          title="ลบสินค้า (ADMIN Only)"
                        >
                          <Trash2 className="w-4 h-4 text-rose-600 dark:text-rose-400" />
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

      {/* Modal 1: Add Product */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 w-full max-w-lg p-6 space-y-4">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
              <Package className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <span>เพิ่มสินค้าใหม่</span>
            </h3>

            {errorMsg && (
              <div className="bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 p-3 rounded text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleCreateProduct} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">รหัสสินค้า (SKU) *</label>
                  <input
                    type="text"
                    required
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg outline-none focus:border-blue-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">บาร์โค้ด (Barcode) *</label>
                  <input
                    type="text"
                    required
                    value={formData.barcode}
                    onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg outline-none focus:border-blue-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">ชื่อสินค้า *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg outline-none focus:border-blue-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">หมวดหมู่ *</label>
                  <select
                    value={formData.categoryId}
                    onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg outline-none focus:border-blue-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">หน่วยนับ *</label>
                  <input
                    type="text"
                    required
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg outline-none focus:border-blue-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 font-semibold"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold flex items-center gap-1 shadow-xs"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>บันทึกสินค้า</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Edit Product (ADMIN ONLY) */}
      {showEditModal && isAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 w-full max-w-lg p-6 space-y-4">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
              <Edit2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <span>แก้ไขข้อมูลสินค้า (สิทธิ์ ADMIN)</span>
            </h3>

            {errorMsg && (
              <div className="bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 p-3 rounded-lg text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleUpdateProduct} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">รหัสสินค้า (SKU) *</label>
                  <input
                    type="text"
                    required
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg outline-none focus:border-indigo-500 bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">บาร์โค้ด (Barcode) *</label>
                  <input
                    type="text"
                    required
                    value={formData.barcode}
                    onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg outline-none focus:border-indigo-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">ชื่อสินค้า *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg outline-none focus:border-indigo-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">หมวดหมู่ *</label>
                  <select
                    value={formData.categoryId}
                    onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg outline-none focus:border-indigo-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">หน่วยนับ *</label>
                  <input
                    type="text"
                    required
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg outline-none focus:border-indigo-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">ราคาทุน (Cost Price)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.costPrice}
                    onChange={(e) => setFormData({ ...formData, costPrice: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg outline-none focus:border-indigo-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">ราคาขาย (Selling Price)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.sellingPrice}
                    onChange={(e) => setFormData({ ...formData, sellingPrice: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg outline-none focus:border-indigo-500 bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 font-mono font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">ขั้นต่ำเตือนภัย (Min Stock)</label>
                  <input
                    type="number"
                    value={formData.minStock}
                    onChange={(e) => setFormData({ ...formData, minStock: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg outline-none focus:border-indigo-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">ขั้นสูงเตือนภัย (Max Stock)</label>
                  <input
                    type="number"
                    value={formData.maxStock}
                    onChange={(e) => setFormData({ ...formData, maxStock: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg outline-none focus:border-indigo-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 font-semibold"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold shadow-2xs flex items-center gap-1"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>บันทึกการแก้ไขสินค้า</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 3: Delete Product (ADMIN ONLY) */}
      {showDeleteModal && deletingProduct && isAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-md p-6 space-y-4">
            <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400 border-b border-slate-100 dark:border-slate-800 pb-3">
              <AlertCircle className="w-6 h-6 shrink-0" />
              <h3 className="font-bold text-lg text-slate-900 dark:text-white">ยืนยันการลบสินค้า (ADMIN Only)</h3>
            </div>

            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              คุณต้องการลบสินค้า <strong className="text-slate-900 dark:text-white font-bold">[{deletingProduct.sku}] {deletingProduct.name}</strong> ใช่หรือไม่?
            </p>

            <div className="bg-rose-50 dark:bg-rose-950/60 p-3 rounded-lg border border-rose-200 dark:border-rose-800 text-xs text-rose-800 dark:text-rose-300 leading-relaxed">
              ⚠️ การลบสินค้าจะทำการปรับสถานะสินค้าเป็นซ่อน/ลบออกจากระบบแคตตาล็อก (Soft Delete) โดยยังคงประวัติการทำรายการเดิมไว้ใน Audit Trail
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 rounded-xl text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleDeleteProduct}
                disabled={deleting}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                <span>{deleting ? 'กำลังลบ...' : 'ยืนยันลบสินค้า'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
