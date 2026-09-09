'use client';

import React, { useState, useEffect } from 'react';
import { Layers, Plus, Search, CheckCircle2, AlertCircle, Trash2, ArrowRightLeft, Edit, PackagePlus, Tag } from 'lucide-react';
import { useRole } from '@/components/context/RoleContext';

export default function ProductBundlesPage() {
  const { currentRole } = useRole();

  const [bundles, setBundles] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal 1: Create / Edit Recipe
  const [showRecipeModal, setShowRecipeModal] = useState(false);
  const [editingBundleId, setEditingBundleId] = useState<string | null>(null);
  const [selectedParentId, setSelectedParentId] = useState('');
  const [parentSearch, setParentSearch] = useState('');
  const [showParentDropdown, setShowParentDropdown] = useState(false);
  const [recipeComponents, setRecipeComponents] = useState<Array<{ componentProductId: string; quantity: number }>>([]);
  const [savingRecipe, setSavingRecipe] = useState(false);
  const [productSearch, setProductSearch] = useState('');

  // Modal 1.5: Quick Add New Parent Product
  const [showQuickParentModal, setShowQuickParentModal] = useState(false);
  const [quickParentSku, setQuickParentSku] = useState('');
  const [quickParentBarcode, setQuickParentBarcode] = useState('');
  const [quickParentName, setQuickParentName] = useState('');
  const [quickParentCategoryId, setQuickParentCategoryId] = useState('');
  const [quickParentSellingPrice, setQuickParentSellingPrice] = useState('0');
  const [quickParentCostPrice, setQuickParentCostPrice] = useState('0');
  const [quickParentUnit, setQuickParentUnit] = useState('ชุด');
  const [quickParentError, setQuickParentError] = useState('');
  const [savingQuickParent, setSavingQuickParent] = useState(false);

  // Modal 2: Assembly Workstation
  const [showAssembleModal, setShowAssembleModal] = useState(false);
  const [activeBundle, setActiveBundle] = useState<any | null>(null);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState('');
  const [assembleQty, setAssembleQty] = useState(1);
  const [assembleMode, setAssembleMode] = useState<'ASSEMBLE' | 'DISASSEMBLE'>('ASSEMBLE');
  const [executing, setExecuting] = useState(false);

  // Modal 3: Delete Confirmation
  const [deletingBundle, setDeletingBundle] = useState<any | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const canManage = currentRole === 'ADMIN' || currentRole === 'MANAGER';

  async function loadData() {
    try {
      setLoading(true);
      const [bundleRes, prodRes, whRes, catRes] = await Promise.all([
        fetch('/api/bundles'),
        fetch('/api/products?limit=2000'),
        fetch('/api/warehouses'),
        fetch('/api/categories'),
      ]);

      const bundleData = await bundleRes.json();
      const prodData = await prodRes.json();
      const whData = await whRes.json();
      const catData = await catRes.json();

      setBundles(Array.isArray(bundleData) ? bundleData : []);

      const rawProductsList = Array.isArray(prodData)
        ? prodData
        : prodData.data || prodData.products || [];
      setProducts(Array.isArray(rawProductsList) ? rawProductsList : []);

      setWarehouses(Array.isArray(whData) ? whData : []);
      setCategories(Array.isArray(catData) ? catData : []);

      if (whData && whData.length > 0 && !selectedWarehouseId) {
        setSelectedWarehouseId(whData[0].id);
      }
      if (catData && catData.length > 0 && !quickParentCategoryId) {
        setQuickParentCategoryId(catData[0].id);
      }
    } catch (e) {
      console.error('Error loading data:', e);
      setBundles([]);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const handleAddComponentRow = (compProdId: string) => {
    if (!compProdId) return;
    if (recipeComponents.some((c) => c.componentProductId === compProdId)) return;

    setRecipeComponents([...recipeComponents, { componentProductId: compProdId, quantity: 1 }]);
  };

  const handleRemoveComponentRow = (compProdId: string) => {
    setRecipeComponents(recipeComponents.filter((c) => c.componentProductId !== compProdId));
  };

  const handleComponentQtyChange = (compProdId: string, qty: number) => {
    setRecipeComponents(
      recipeComponents.map((c) =>
        c.componentProductId === compProdId ? { ...c, quantity: Math.max(1, qty) } : c
      )
    );
  };

  const openCreateModal = () => {
    setEditingBundleId(null);
    setSelectedParentId('');
    setParentSearch('');
    setRecipeComponents([]);
    setErrorMsg('');
    setSuccessMsg('');
    setShowRecipeModal(true);
  };

  const openEditModal = (bundle: any) => {
    setEditingBundleId(bundle.id);
    setSelectedParentId(bundle.id);
    setParentSearch(`[${bundle.sku}] ${bundle.name}`);
    setRecipeComponents(
      (bundle.bundleItems || []).map((item: any) => ({
        componentProductId: item.componentProductId || item.componentProduct?.id,
        quantity: item.quantity || 1,
      }))
    );
    setErrorMsg('');
    setSuccessMsg('');
    setShowRecipeModal(true);
  };

  const openQuickAddParentModal = () => {
    const autoNum = Math.floor(1000 + Math.random() * 9000);
    setQuickParentSku(`BUNDLE-${autoNum}`);
    setQuickParentBarcode(`885${Date.now().toString().slice(-10)}`);
    setQuickParentName('');
    if (categories.length > 0) setQuickParentCategoryId(categories[0].id);
    setQuickParentSellingPrice('0');
    setQuickParentCostPrice('0');
    setQuickParentUnit('ชุด');
    setQuickParentError('');
    setShowQuickParentModal(true);
  };

  const handleCreateQuickParent = async (e: React.FormEvent) => {
    e.preventDefault();
    setQuickParentError('');

    if (!quickParentName.trim()) {
      setQuickParentError('กรุณาระบุชื่อสินค้าชุดแม่');
      return;
    }
    if (!quickParentCategoryId) {
      setQuickParentError('กรุณาเลือกหมวดหมู่สินค้า');
      return;
    }

    try {
      setSavingQuickParent(true);
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': currentRole || 'ADMIN',
        },
        body: JSON.stringify({
          sku: quickParentSku.trim(),
          barcode: quickParentBarcode.trim(),
          name: quickParentName.trim(),
          categoryId: quickParentCategoryId,
          unit: quickParentUnit.trim() || 'ชุด',
          costPrice: parseFloat(quickParentCostPrice) || 0,
          sellingPrice: parseFloat(quickParentSellingPrice) || 0,
          isBundle: true,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create bundle parent product');

      // Append to product list and select as parent
      setProducts([data, ...products]);
      setSelectedParentId(data.id);
      setParentSearch(`[${data.sku}] ${data.name}`);
      setShowQuickParentModal(false);
    } catch (err: any) {
      setQuickParentError(err.message);
    } finally {
      setSavingQuickParent(false);
    }
  };

  const handleSaveRecipe = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!selectedParentId) {
      setErrorMsg('กรุณาเลือกสินค้าชุดแม่ (Parent Bundle Product)');
      return;
    }

    if (recipeComponents.length === 0) {
      setErrorMsg('กรุณาเพิ่มสินค้าชิ้นส่วนประกอบอย่างน้อย 1 รายการ');
      return;
    }

    try {
      setSavingRecipe(true);
      const url = editingBundleId ? `/api/bundles/${editingBundleId}` : '/api/bundles';
      const method = editingBundleId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': currentRole || 'ADMIN',
        },
        body: JSON.stringify({
          bundleProductId: selectedParentId,
          components: recipeComponents,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save bundle recipe');

      setSuccessMsg(editingBundleId ? 'แก้ไขสูตรจัดชุดสินค้าเรียบร้อยแล้ว!' : 'บันทึกสูตรจัดชุดสินค้าเรียบร้อยแล้ว!');
      setShowRecipeModal(false);
      setEditingBundleId(null);
      setSelectedParentId('');
      setParentSearch('');
      setRecipeComponents([]);
      await loadData();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setSavingRecipe(false);
    }
  };

  const handleDeleteBundleRecipe = async () => {
    if (!deletingBundle) return;
    setErrorMsg('');
    setSuccessMsg('');

    try {
      setDeleting(true);
      const res = await fetch(`/api/bundles/${deletingBundle.id}`, {
        method: 'DELETE',
        headers: {
          'x-user-role': currentRole || 'ADMIN',
        },
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete bundle recipe');

      setSuccessMsg(`ลบสูตรชุดสินค้า [${deletingBundle.name}] เรียบร้อยแล้ว`);
      setDeletingBundle(null);
      await loadData();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setDeleting(false);
    }
  };

  const handleExecuteAssemble = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeBundle) return;
    setErrorMsg('');
    setSuccessMsg('');

    try {
      setExecuting(true);
      const res = await fetch('/api/bundles/assemble', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': currentRole || 'ADMIN',
        },
        body: JSON.stringify({
          bundleProductId: activeBundle.id,
          warehouseId: selectedWarehouseId,
          quantity: assembleQty,
          createdById: 'usr-admin',
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to assemble bundle');

      setSuccessMsg(data.message);
      setShowAssembleModal(false);
      await loadData();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setExecuting(false);
    }
  };

  const productList = Array.isArray(products) ? products : [];

  const filteredParentProducts = productList.filter(
    (p) =>
      (p.sku && p.sku.toLowerCase().includes(parentSearch.toLowerCase())) ||
      (p.name && p.name.toLowerCase().includes(parentSearch.toLowerCase()))
  );

  const filteredSearchProducts = productList.filter(
    (p) =>
      (p.sku && p.sku.toLowerCase().includes(productSearch.toLowerCase())) ||
      (p.name && p.name.toLowerCase().includes(productSearch.toLowerCase()))
  );

  const selectedParentProduct = productList.find((p) => p.id === selectedParentId);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Layers className="w-7 h-7 text-blue-600" />
            <span>ระบบจัดชุดสินค้า (Product Kit & Bundling Workstation)</span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            กำหนดสูตรสินค้าชุด (Bill of Materials) และประกอบสินค้าจากชิ้นส่วนอะไหล่ 800+ รายการ พร้อมหัก/เติมสต็อกให้อัตโนมัติ
          </p>
        </div>

        {canManage && (
          <button
            onClick={openCreateModal}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold flex items-center gap-2 shadow-xs transition-all shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>+ สร้างสูตรชุดสินค้าใหม่ (Create Bundle Recipe)</span>
          </button>
        )}
      </div>

      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 p-4 rounded-xl text-sm flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600" />
          <span className="font-semibold">{successMsg}</span>
        </div>
      )}

      {/* Bundle Recipes List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {loading ? (
          <div className="col-span-2 bg-white p-12 rounded-xl border border-slate-200 text-center text-slate-400">
            กำลังโหลดสูตรชุดสินค้า...
          </div>
        ) : bundles.length === 0 ? (
          <div className="col-span-2 bg-white p-12 rounded-xl border border-slate-200 text-center text-slate-400">
            ยังไม่มีสูตรชุดสินค้าในระบบ กดปุ่ม "+ สร้างสูตรชุดสินค้าใหม่" เพื่อเริ่มต้น
          </div>
        ) : (
          bundles.map((bundle) => (
            <div
              key={bundle.id}
              className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden flex flex-col justify-between group hover:border-slate-300 transition-all"
            >
              <div className="p-5 border-b border-slate-100 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 font-mono font-bold text-xs rounded-full">
                    {bundle.sku}
                  </span>

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-400 mr-1">
                      {bundle.bundleItems?.length || 0} รายการชิ้นส่วน
                    </span>

                    {/* Admin / Manager Actions */}
                    {canManage && (
                      <button
                        onClick={() => openEditModal(bundle)}
                        className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-slate-200"
                        title="แก้ไขสูตรจัดชุดสินค้า"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {canManage && (
                      <button
                        onClick={() => setDeletingBundle(bundle)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors border border-slate-200"
                        title="ลบสูตรจัดชุดสินค้า"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
                <h3 className="text-base font-bold text-slate-900">{bundle.name}</h3>
                <p className="text-xs text-slate-500">หน่วยนับ: {bundle.unit}</p>
              </div>

              {/* Component breakdown */}
              <div className="p-5 bg-slate-50/50 flex-1 space-y-3">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  ชิ้นส่วนส่วนประกอบภายใน (COMPONENT RECIPE):
                </h4>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {(bundle.bundleItems || []).map((item: any) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between bg-white p-2.5 rounded-lg border border-slate-200 text-xs"
                    >
                      <div>
                        <span className="font-mono font-bold text-slate-800">{item.componentProduct?.sku}</span>
                        <span className="text-slate-600 ml-2">{item.componentProduct?.name}</span>
                      </div>
                      <span className="font-bold text-blue-600 shrink-0 font-mono bg-blue-50 px-2 py-0.5 rounded">
                        x{item.quantity} {item.componentProduct?.unit || 'ชิ้น'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action */}
              <div className="p-4 bg-white border-t border-slate-100 flex justify-end">
                <button
                  onClick={() => {
                    setActiveBundle(bundle);
                    setShowAssembleModal(true);
                    setErrorMsg('');
                  }}
                  className="w-full sm:w-auto px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition-all"
                >
                  <ArrowRightLeft className="w-4 h-4" />
                  <span>ประกอบ / ถอดชุดสินค้า (Assemble Workstation)</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal 1: Create / Edit Recipe */}
      {showRecipeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-2xl p-6 space-y-5">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
              <Layers className="w-5 h-5 text-blue-600" />
              <span>{editingBundleId ? 'แก้ไขสูตรจัดชุดสินค้า' : 'สร้างสูตรจัดชุดสินค้าใหม่ (Bundle Recipe)'}</span>
            </h3>

            {errorMsg && (
              <div className="bg-rose-50 border border-rose-200 text-rose-700 p-3 rounded-lg text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSaveRecipe} className="space-y-4 text-xs">
              {/* Searchable Parent Product Selector with Quick Add Button */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-semibold text-slate-700">เลือกสินค้าตัวแม่ (Parent Bundle Item) *</label>
                  {!editingBundleId && (
                    <button
                      type="button"
                      onClick={openQuickAddParentModal}
                      className="text-xs text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1"
                    >
                      <PackagePlus className="w-3.5 h-3.5 text-blue-600" />
                      <span>+ เพิ่มสินค้าแม่ใหม่</span>
                    </button>
                  )}
                </div>

                {editingBundleId ? (
                  <input
                    type="text"
                    disabled
                    value={selectedParentProduct ? `[${selectedParentProduct.sku}] ${selectedParentProduct.name}` : selectedParentId}
                    className="w-full px-3 py-2 bg-slate-100 border border-slate-300 rounded-lg text-xs font-bold text-slate-800 outline-none"
                  />
                ) : (
                  <div className="relative">
                    <div className="relative">
                      <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                      <input
                        type="text"
                        value={parentSearch}
                        onFocus={() => setShowParentDropdown(true)}
                        onChange={(e) => {
                          setParentSearch(e.target.value);
                          setShowParentDropdown(true);
                        }}
                        placeholder="ค้นหาสินค้าตัวแม่ (พิมพ์ SKU, บาร์โค้ด หรือชื่อสินค้า)..."
                        className="w-full pl-9 pr-8 py-2 bg-white border border-slate-300 rounded-lg outline-none focus:border-blue-500 font-semibold text-slate-900"
                      />
                      {selectedParentId && (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedParentId('');
                            setParentSearch('');
                            setShowParentDropdown(true);
                          }}
                          className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 font-bold"
                        >
                          ✕
                        </button>
                      )}
                    </div>

                    {showParentDropdown && (
                      <div className="absolute left-0 right-0 top-full mt-1 z-30 max-h-48 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-xl divide-y divide-slate-100">
                        {filteredParentProducts.length === 0 ? (
                          <div className="p-3 text-center text-slate-400">ไม่พบสินค้าตัวแม่ กดปุ่ม "+ เพิ่มสินค้าแม่ใหม่" เพื่อสร้างเพิ่ม</div>
                        ) : (
                          filteredParentProducts.slice(0, 15).map((p) => (
                            <div
                              key={p.id}
                              onClick={() => {
                                setSelectedParentId(p.id);
                                setParentSearch(`[${p.sku}] ${p.name}`);
                                setShowParentDropdown(false);
                              }}
                              className={`p-2.5 hover:bg-blue-50 cursor-pointer flex items-center justify-between transition-colors ${
                                selectedParentId === p.id ? 'bg-blue-50 font-bold' : ''
                              }`}
                            >
                              <div>
                                <span className="font-mono font-bold text-blue-600 mr-2">[{p.sku}]</span>
                                <span className="text-slate-800">{p.name}</span>
                              </div>
                              {p.isBundle && (
                                <span className="text-[10px] bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-bold">
                                  ชุดแม่ (Bundle)
                                </span>
                              )}
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Add Component search dropdown */}
              <div className="border border-slate-200 p-3 rounded-xl bg-slate-50 space-y-2">
                <label className="block font-semibold text-slate-700">ค้นหาและเพิ่มชิ้นส่วนลูก (Component Parts)</label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                    <input
                      type="text"
                      value={productSearch}
                      onChange={(e) => setProductSearch(e.target.value)}
                      placeholder="พิมพ์ SKU หรือชื่อสินค้าอะไหล่ (จาก 800+ รายการ)..."
                      className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-lg outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                {productSearch && (
                  <div className="max-h-36 overflow-y-auto bg-white border border-slate-200 rounded-lg divide-y divide-slate-100 shadow-xs">
                    {filteredSearchProducts.slice(0, 10).map((p) => (
                      <div
                        key={p.id}
                        onClick={() => {
                          handleAddComponentRow(p.id);
                          setProductSearch('');
                        }}
                        className="p-2 hover:bg-blue-50 cursor-pointer flex items-center justify-between"
                      >
                        <span className="font-mono font-bold text-slate-900">[{p.sku}] {p.name}</span>
                        <span className="text-blue-600 font-bold">+ เพิ่ม</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Components selected table */}
              <div className="space-y-2">
                <label className="block font-semibold text-slate-700">รายการชิ้นส่วนประกอบที่เลือกไว้ ({recipeComponents.length} รายการ):</label>
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left">
                    <thead className="bg-slate-100 text-slate-600 text-[11px] uppercase">
                      <tr>
                        <th className="p-2.5">รหัสสินค้าลูก</th>
                        <th className="p-2.5">ชื่อสินค้า</th>
                        <th className="p-2.5 text-right w-28">จำนวนที่ใช้/1ชุด</th>
                        <th className="p-2.5 text-center w-12">ลบ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {recipeComponents.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="text-center py-4 text-slate-400">
                            ยังไม่มีชิ้นส่วนลูก เลือกชิ้นส่วนจากกล่องค้นหาด้านบน
                          </td>
                        </tr>
                      ) : (
                        recipeComponents.map((c) => {
                          const prod = productList.find((p) => p.id === c.componentProductId);
                          if (!prod) return null;

                          return (
                            <tr key={c.componentProductId}>
                              <td className="p-2.5 font-mono font-bold text-blue-600">{prod.sku}</td>
                              <td className="p-2.5 text-slate-800">{prod.name}</td>
                              <td className="p-2.5 text-right">
                                <input
                                  type="number"
                                  min="1"
                                  value={c.quantity}
                                  onChange={(e) => handleComponentQtyChange(c.componentProductId, parseInt(e.target.value) || 1)}
                                  className="w-20 px-2 py-1 border border-slate-300 rounded text-right font-mono font-bold"
                                />
                              </td>
                              <td className="p-2.5 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleRemoveComponentRow(c.componentProductId)}
                                  className="text-rose-500 hover:text-rose-700"
                                >
                                  <Trash2 className="w-4 h-4 mx-auto" />
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

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowRecipeModal(false);
                    setEditingBundleId(null);
                  }}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-slate-600 font-semibold"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={savingRecipe}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold shadow-xs"
                >
                  {savingRecipe ? 'กำลังบันทึก...' : 'บันทึกสูตรจัดชุด'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 1.5: Quick Add New Parent Product */}
      {showQuickParentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <h3 className="font-bold text-base flex items-center gap-2">
                <PackagePlus className="w-5 h-5 text-blue-400" />
                <span>สร้างสินค้าตัวแม่ใหม่ (Quick Add Bundle Product)</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowQuickParentModal(false)}
                className="text-slate-400 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateQuickParent} className="p-6 space-y-4 text-xs">
              {quickParentError && (
                <div className="bg-rose-50 border border-rose-200 text-rose-700 p-3 rounded-lg flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{quickParentError}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">รหัส SKU สินค้าแม่ *</label>
                  <input
                    type="text"
                    required
                    value={quickParentSku}
                    onChange={(e) => setQuickParentSku(e.target.value.toUpperCase())}
                    placeholder="เช่น BUNDLE-SET-001"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none font-mono uppercase focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">บาร์โค้ด (Barcode)</label>
                  <input
                    type="text"
                    value={quickParentBarcode}
                    onChange={(e) => setQuickParentBarcode(e.target.value)}
                    placeholder="รหัสบาร์โค้ด..."
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none font-mono focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">ชื่อสินค้าตัวแม่ (Parent Bundle Name) *</label>
                <input
                  type="text"
                  required
                  value={quickParentName}
                  onChange={(e) => setQuickParentName(e.target.value)}
                  placeholder="เช่น ชุดตู้หยอดเหรียญซักผ้าสำเร็จรูป (Set A)"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none font-bold text-slate-900 focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">หมวดหมู่สินค้า *</label>
                  <select
                    value={quickParentCategoryId}
                    onChange={(e) => setQuickParentCategoryId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none font-semibold focus:border-blue-500"
                  >
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">หน่วยนับ *</label>
                  <input
                    type="text"
                    required
                    value={quickParentUnit}
                    onChange={(e) => setQuickParentUnit(e.target.value)}
                    placeholder="เช่น ชุด, เซ็ต, เครื่อง"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">ราคาทุน (Cost Price ฿)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={quickParentCostPrice}
                    onChange={(e) => setQuickParentCostPrice(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none font-mono text-right focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">ราคาขาย (Selling Price ฿)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={quickParentSellingPrice}
                    onChange={(e) => setQuickParentSellingPrice(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none font-mono font-bold text-blue-600 text-right focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowQuickParentModal(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-600 rounded-lg font-semibold hover:bg-slate-50"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={savingQuickParent}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold shadow-xs flex items-center gap-1"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{savingQuickParent ? 'กำลังบันทึก...' : 'บันทึกสินค้าแม่'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Assemble Workstation */}
      {showAssembleModal && activeBundle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-lg p-6 space-y-5">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
              <ArrowRightLeft className="w-5 h-5 text-indigo-600" />
              <span>ประกอบ / ถอดชุดสินค้า: [{activeBundle.sku}]</span>
            </h3>

            {errorMsg && (
              <div className="bg-rose-50 border border-rose-200 text-rose-700 p-3 rounded-lg text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleExecuteAssemble} className="space-y-4 text-xs">
              <div className="bg-indigo-50 p-3 rounded-xl border border-indigo-100">
                <p className="font-bold text-indigo-900">{activeBundle.name}</p>
                <p className="text-[11px] text-indigo-700 mt-0.5">
                  ประกอบจากชิ้นส่วนทั้งหมด {activeBundle.bundleItems?.length || 0} รายการ
                </p>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">เลือกโหมดการทำงาน</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setAssembleMode('ASSEMBLE')}
                    className={`py-2 rounded-lg font-bold text-xs border transition-all ${
                      assembleMode === 'ASSEMBLE'
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    🔨 ประกอบเข้าคลัง (Assemble)
                  </button>
                  <button
                    type="button"
                    onClick={() => setAssembleMode('DISASSEMBLE')}
                    className={`py-2 rounded-lg font-bold text-xs border transition-all ${
                      assembleMode === 'DISASSEMBLE'
                        ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    🔧 ถอดชิ้นส่วน (Disassemble)
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">เลือกคลังสินค้า *</label>
                <select
                  value={selectedWarehouseId}
                  onChange={(e) => setSelectedWarehouseId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:border-indigo-500 font-semibold"
                >
                  {warehouses.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.code} - {w.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">จำนวนชุดสินค้าที่ต้องการดำเนินงาน *</label>
                <input
                  type="number"
                  min="1"
                  value={assembleQty}
                  onChange={(e) => setAssembleQty(parseInt(e.target.value) || 1)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:border-indigo-500 font-mono font-bold text-sm"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAssembleModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-slate-600 font-semibold"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={executing}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold shadow-xs"
                >
                  {executing ? 'กำลังดำเนินการ...' : 'ยืนยันการทำงาน'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 3: Delete Bundle Recipe Confirmation */}
      {deletingBundle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md p-6 space-y-4">
            <div className="flex items-center gap-3 text-rose-600 border-b border-slate-100 pb-3">
              <AlertCircle className="w-6 h-6 shrink-0" />
              <h3 className="font-bold text-lg text-slate-900">ยืนยันการลบสูตรสินค้าชุด</h3>
            </div>

            <p className="text-sm text-slate-600 leading-relaxed">
              คุณต้องการลบสูตรสินค้าชุด <strong className="text-slate-900">[{deletingBundle.sku}] {deletingBundle.name}</strong> ใช่หรือไม่?
            </p>
            <p className="text-xs text-slate-500 bg-slate-50 p-3 rounded-lg border border-slate-200">
              * การลบสูตรสินค้าชุดจะทำการยกเลิกสถานะสินค้าชุดและลบรายการส่วนประกอบภายใน แต่จะไม่กระทบสต็อกสินค้าที่มีอยู่แล้ว
            </p>

            <div className="flex justify-end gap-3 pt-3">
              <button
                type="button"
                onClick={() => setDeletingBundle(null)}
                className="px-4 py-2 border border-slate-300 text-slate-600 rounded-xl text-sm font-semibold hover:bg-slate-50"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleDeleteBundleRecipe}
                disabled={deleting}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-sm font-bold shadow-xs flex items-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                <span>{deleting ? 'กำลังลบ...' : 'ยืนยันลบสูตรสินค้าชุด'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
