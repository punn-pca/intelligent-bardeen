'use client';

import React, { useState, useEffect } from 'react';
import { Package, ArrowLeft, History, Warehouse, CircleDollarSign, ArrowDownRight, ArrowUpRight, ArrowLeftRight, Sliders, Edit2, CheckCircle2, AlertCircle, ShieldAlert } from 'lucide-react';
import Link from 'next/link';
import { useRole } from '@/components/context/RoleContext';

export default function ProductDetailPage({ params }: { params: { id: string } }) {
  const { currentRole } = useRole();
  const [product, setProduct] = useState<any>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Edit Modal State (ADMIN ONLY)
  const [showEditModal, setShowEditModal] = useState(false);
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

  const isAdmin = currentRole === 'ADMIN';

  async function loadProductDetail() {
    try {
      setLoading(true);
      const [res, catRes] = await Promise.all([
        fetch(`/api/products/${params.id}`),
        fetch('/api/categories'),
      ]);

      const data = await res.json();
      const catData = await catRes.json();

      setProduct(data);
      setCategories(catData || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProductDetail();
  }, [params.id]);

  const handleOpenEditModal = () => {
    if (!isAdmin) {
      setErrorMsg('สิทธิ์ไม่ถูกต้อง: เฉพาะสิทธิ์ ADMIN เท่านั้นที่สามารถแก้ไขข้อมูลสินค้าได้');
      return;
    }

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
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await fetch(`/api/products/${params.id}`, {
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
      await loadProductDetail();
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-slate-400 dark:text-slate-500">กำลังโหลดรายละเอียดสินค้า...</div>;
  }

  if (!product || product.error) {
    return (
      <div className="p-8 text-center text-slate-500 dark:text-slate-400">
        <p className="text-lg font-bold">ไม่พบสินค้า</p>
        <Link href="/products" className="text-emerald-600 dark:text-emerald-400 hover:underline mt-2 inline-block text-sm">
          ← กลับหน้าสินค้า
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Back Button */}
      <div className="flex items-center justify-between">
        <Link href="/products" className="inline-flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 font-medium">
          <ArrowLeft className="w-4 h-4" />
          <span>ย้อนกลับไปรายการสินค้า</span>
        </Link>

        {/* EDIT BUTTON: Displayed ONLY for ADMIN role */}
        {isAdmin && (
          <button
            onClick={handleOpenEditModal}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold flex items-center gap-2 shadow-xs transition-all"
          >
            <Edit2 className="w-4 h-4" />
            <span>แก้ไขข้อมูลสินค้า (ADMIN Only)</span>
          </button>
        )}
      </div>

      {successMsg && (
        <div className="bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 p-3.5 rounded-xl text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="bg-rose-50 dark:bg-rose-950/80 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 p-3.5 rounded-xl text-xs font-bold flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Product Summary Header Card */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 bg-slate-900 dark:bg-slate-950 text-emerald-400 rounded-xl flex items-center justify-center font-mono font-bold text-xl shadow-md shrink-0 border border-slate-800">
            SKU
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">{product.name}</h1>
              <span className="font-mono text-xs bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2.5 py-1 rounded font-semibold border border-slate-200 dark:border-slate-700">
                {product.sku}
              </span>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Barcode: <span className="font-mono text-slate-700 dark:text-slate-300">{product.barcode}</span> | หมวดหมู่:{' '}
              <span className="font-semibold text-slate-700 dark:text-slate-300">{product.category?.name}</span>
            </p>
          </div>
        </div>

        {/* Metric Badges */}
        <div className="flex flex-wrap items-center gap-4 bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold uppercase">Current Stock</p>
            <p className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">
              {product.totalOnHand} <span className="text-xs font-normal text-slate-500 dark:text-slate-400">{product.unit}</span>
            </p>
          </div>
          <div className="w-px h-8 bg-slate-200 dark:bg-slate-700" />
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold uppercase">Cost Price</p>
            <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">฿{(product.costPrice || 0).toLocaleString('th-TH')}</p>
          </div>
          <div className="w-px h-8 bg-slate-200 dark:bg-slate-700" />
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold uppercase">Selling Price</p>
            <p className="text-xl font-bold text-blue-600 dark:text-blue-400 mt-0.5">฿{(product.sellingPrice || 0).toLocaleString('th-TH')}</p>
          </div>
        </div>
      </div>

      {/* Warehouse Stock Matrix Breakdown */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-4 flex items-center gap-2">
          <Warehouse className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span>จำนวนสินค้าแยกตามคลังสินค้า</span>
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {(product.inventories || []).map((inv: any) => (
            <div key={inv.id} className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <p className="font-bold text-slate-800 dark:text-slate-200 text-sm">{inv.warehouse.name}</p>
                <p className="text-xs font-mono text-slate-500 dark:text-slate-400">{inv.warehouse.code}</p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-slate-900 dark:text-white">{inv.onHand}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">พร้อมเบิก: {inv.onHand - inv.reserved}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Chronological Stock Card Ledger Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2">
            <History className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span>Stock Card (ประวัติบัญชีคุมสต๊อกรายสินค้า)</span>
          </h3>
          <span className="text-xs text-slate-400 dark:text-slate-500 font-mono font-semibold">
            {product.movements?.length || 0} รายการเคลื่อนไหว
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 uppercase font-bold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="p-3">วันที่/เวลา</th>
                <th className="p-3">เลขที่บิล/อ้างอิง</th>
                <th className="p-3">ประเภท</th>
                <th className="p-3 text-right text-emerald-700 dark:text-emerald-300 bg-emerald-50/50 dark:bg-emerald-950/30">รับเข้า (+)</th>
                <th className="p-3 text-right text-rose-700 dark:text-rose-300 bg-rose-50/50 dark:bg-rose-950/30">เบิกออก (-)</th>
                <th className="p-3 text-right font-bold text-slate-900 dark:text-white bg-amber-50/50 dark:bg-amber-950/30">คงเหลือสุทธิ</th>
                <th className="p-3 font-sans">เหตุผล/หมายเหตุ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {(!product.movements || product.movements.length === 0) ? (
                <tr>
                  <td colSpan={7} className="text-center py-6 text-slate-400 dark:text-slate-500 font-sans">
                    ยังไม่มีประวัติการเคลื่อนไหวสำหรับสินค้านี้
                  </td>
                </tr>
              ) : (
                product.movements.map((m: any) => (
                  <tr key={m.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-all">
                    <td className="p-3 text-slate-500 dark:text-slate-400" suppressHydrationWarning>
                      {m.createdAt ? new Date(m.createdAt).toLocaleDateString('en-US') : '-'}
                    </td>
                    <td className="p-3 font-bold text-blue-600 dark:text-blue-400">{m.reference || m.transactionId || '-'}</td>
                    <td className="p-3 font-sans font-semibold">
                      <span className={`px-2 py-0.5 rounded text-[10px] ${m.quantity > 0 ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300' : 'bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300'}`}>
                        {m.type}
                      </span>
                    </td>
                    <td className="p-3 text-right text-emerald-600 dark:text-emerald-400 bg-emerald-50/30 dark:bg-emerald-950/20">
                      {m.quantity > 0 ? `+${m.quantity}` : '-'}
                    </td>
                    <td className="p-3 text-right text-rose-600 dark:text-rose-400 bg-rose-50/30 dark:bg-rose-950/20">
                      {m.quantity < 0 ? Math.abs(m.quantity) : '-'}
                    </td>
                    <td className="p-3 text-right font-bold text-slate-900 dark:text-white bg-amber-50/30 dark:bg-amber-950/20">
                      {m.afterOnHand}
                    </td>
                    <td className="p-3 text-slate-600 dark:text-slate-400 font-sans">{m.reason || '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Product Modal (ADMIN ONLY) */}
      {showEditModal && isAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 w-full max-w-lg p-6 space-y-4">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
              <Edit2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <span>แก้ไขข้อมูลสินค้า (สิทธิ์ ADMIN)</span>
            </h3>

            {errorMsg && (
              <div className="bg-rose-50 dark:bg-rose-950/80 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 p-3 rounded-lg text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
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
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg outline-none bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:border-indigo-500 font-mono font-bold text-blue-600 dark:text-blue-400"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">บาร์โค้ด (Barcode) *</label>
                  <input
                    type="text"
                    required
                    value={formData.barcode}
                    onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg outline-none bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:border-indigo-500 font-mono"
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
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg outline-none bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:border-indigo-500 font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">หมวดหมู่ *</label>
                  <select
                    value={formData.categoryId}
                    onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg outline-none bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:border-indigo-500 font-medium"
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
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg outline-none bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:border-indigo-500"
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
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg outline-none bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:border-indigo-500 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">ราคาขาย (Selling Price)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.sellingPrice}
                    onChange={(e) => setFormData({ ...formData, sellingPrice: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg outline-none bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 focus:border-indigo-500 font-mono font-bold"
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
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg outline-none bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:border-indigo-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">ขั้นสูงเตือนภัย (Max Stock)</label>
                  <input
                    type="number"
                    value={formData.maxStock}
                    onChange={(e) => setFormData({ ...formData, maxStock: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg outline-none bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:border-indigo-500 font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold"
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
    </div>
  );
}
