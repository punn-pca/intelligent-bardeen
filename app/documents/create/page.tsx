'use client';

import React, { useState, useEffect } from 'react';
import { FilePlus, Plus, Trash2, ArrowLeft, CheckCircle2, AlertCircle, UserPlus, Building, Phone, Mail, MapPin, FileText } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useRole } from '@/components/context/RoleContext';
import SearchableProductSelect from '@/components/common/SearchableProductSelect';

export default function CreateDocumentPage() {
  const { currentRole } = useRole();
  const router = useRouter();

  const [documentType, setDocumentType] = useState('PO');
  const [supplierId, setSupplierId] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [targetWarehouseId, setTargetWarehouseId] = useState('');
  const [refDocumentNo, setRefDocumentNo] = useState('');
  const [discount, setDiscount] = useState('0');
  const [tax, setTax] = useState('0');
  const [notes, setNotes] = useState('');

  const [items, setItems] = useState<Array<{ productId: string; quantity: number; unitPrice: number; discount: number }>>([
    { productId: '', quantity: 1, unitPrice: 0, discount: 0 },
  ]);

  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Quick Add Partner Modal State
  const [showPartnerModal, setShowPartnerModal] = useState(false);
  const [partnerType, setPartnerType] = useState<'CUSTOMER' | 'SUPPLIER'>('CUSTOMER');
  const [partnerCode, setPartnerCode] = useState('');
  const [partnerName, setPartnerName] = useState('');
  const [partnerContactPerson, setPartnerContactPerson] = useState('');
  const [partnerPhone, setPartnerPhone] = useState('');
  const [partnerEmail, setPartnerEmail] = useState('');
  const [partnerTaxId, setPartnerTaxId] = useState('');
  const [partnerAddress, setPartnerAddress] = useState('');
  const [partnerModalError, setPartnerModalError] = useState('');
  const [savingPartner, setSavingPartner] = useState(false);

  useEffect(() => {
    async function loadMasterData() {
      try {
        const [supRes, custRes, whRes, prodRes] = await Promise.all([
          fetch('/api/suppliers'),
          fetch('/api/customers'),
          fetch('/api/warehouses'),
          fetch('/api/products?limit=2000'),
        ]);

        const supData = await supRes.json();
        const custData = await custRes.json();
        const whData = await whRes.json();
        const prodData = await prodRes.json();

        setSuppliers(Array.isArray(supData) ? supData : []);
        setCustomers(Array.isArray(custData) ? custData : []);
        setWarehouses(Array.isArray(whData) ? whData : []);

        const rawProductsList = Array.isArray(prodData)
          ? prodData
          : prodData.data || prodData.products || [];
        setProducts(Array.isArray(rawProductsList) ? rawProductsList : []);

        if (whData && whData.length > 0) {
          setWarehouseId(whData[0].id);
          if (whData.length > 1) setTargetWarehouseId(whData[1].id);
        }
      } catch (e) {
        console.error(e);
      }
    }

    loadMasterData();
  }, []);

  const handleAddItem = () => {
    setItems([...items, { productId: '', quantity: 1, unitPrice: 0, discount: 0 }]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, idx) => idx !== index));
  };

  const handleItemChange = (index: number, field: string, value: any) => {
    const updated = [...items];
    const targetItem = { ...updated[index] };

    if (field === 'productId') {
      targetItem.productId = value;
      const selectedProd = products.find((p) => p.id === value);
      if (selectedProd) {
        targetItem.unitPrice = selectedProd.costPrice || selectedProd.sellingPrice || 0;
      }
    } else if (field === 'quantity') {
      targetItem.quantity = Math.max(1, parseInt(value) || 1);
    } else if (field === 'unitPrice') {
      targetItem.unitPrice = parseFloat(value) || 0;
    } else if (field === 'discount') {
      targetItem.discount = parseFloat(value) || 0;
    }

    updated[index] = targetItem;
    setItems(updated);
  };

  const openQuickAddModal = (type: 'CUSTOMER' | 'SUPPLIER') => {
    setPartnerType(type);
    const prefix = type === 'CUSTOMER' ? 'CUST' : 'SUPP';
    const autoCode = `${prefix}-${Math.floor(1000 + Math.random() * 9000)}`;
    setPartnerCode(autoCode);
    setPartnerName('');
    setPartnerContactPerson('');
    setPartnerPhone('');
    setPartnerEmail('');
    setPartnerTaxId('');
    setPartnerAddress('');
    setPartnerModalError('');
    setShowPartnerModal(true);
  };

  const handleCreatePartner = async (e: React.FormEvent) => {
    e.preventDefault();
    setPartnerModalError('');

    if (!partnerName.trim()) {
      setPartnerModalError('กรุณาระบุชื่อคู่ค้า / ลูกค้า');
      return;
    }

    try {
      setSavingPartner(true);
      const url = partnerType === 'CUSTOMER' ? '/api/customers' : '/api/suppliers';
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': currentRole || 'ADMIN',
        },
        body: JSON.stringify({
          code: partnerCode.trim(),
          name: partnerName.trim(),
          contactPerson: partnerContactPerson.trim(),
          phone: partnerPhone.trim(),
          email: partnerEmail.trim(),
          taxId: partnerTaxId.trim(),
          address: partnerAddress.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create partner');

      if (partnerType === 'CUSTOMER') {
        setCustomers([...customers, data]);
        setCustomerId(data.id);
      } else {
        setSuppliers([...suppliers, data]);
        setSupplierId(data.id);
      }

      setShowPartnerModal(false);
    } catch (err: any) {
      setPartnerModalError(err.message);
    } finally {
      setSavingPartner(false);
    }
  };

  const subtotal = items.reduce((acc, i) => acc + i.quantity * i.unitPrice - i.discount, 0);
  const discountVal = parseFloat(discount) || 0;
  const taxVal = parseFloat(tax) || 0;
  const grandTotal = Math.max(0, subtotal - discountVal + taxVal);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (items.some((i) => !i.productId)) {
      setErrorMsg('กรุณาเลือกสินค้าให้ครบทุกรายการ');
      return;
    }

    try {
      setLoading(true);
      const res = await fetch('/api/documents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': currentRole || 'ADMIN',
        },
        body: JSON.stringify({
          documentType,
          supplierId: ['PO', 'GRN', 'PR'].includes(documentType) ? supplierId : undefined,
          customerId: ['QUOTATION', 'SO', 'INVOICE', 'RECEIPT', 'DELIVERY_NOTE'].includes(documentType) ? customerId : undefined,
          warehouseId,
          targetWarehouseId: documentType === 'STOCK_TRANSFER' ? targetWarehouseId : undefined,
          refDocumentNo,
          discount: parseFloat(discount) || 0,
          tax: parseFloat(tax) || 0,
          notes,
          items: items.map((i) => ({
            productId: i.productId,
            quantity: i.quantity,
            unitCost: i.unitPrice,
            unitPrice: i.unitPrice,
            discount: i.discount,
          })),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create document');

      router.push('/documents');
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-200">
      <div className="flex items-center justify-between border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <FilePlus className="w-7 h-7 text-blue-600" />
            <span>สร้างเอกสารใหม่ (Create Document)</span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">ออกเอกสารซื้อ-ขาย คลังสินค้า และบัญชี พร้อมสร้างเลขที่เอกสารอัตโนมัติ</p>
        </div>
        <Link href="/documents" className="text-xs font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" />
          <span>ย้อนกลับ</span>
        </Link>
      </div>

      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
        <form onSubmit={handleSubmit} className="space-y-6">
          {errorMsg && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 p-3.5 rounded-lg text-sm flex items-center gap-2">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Form Top Header */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">เลือกประเภทเอกสาร *</label>
              <select
                value={documentType}
                onChange={(e) => setDocumentType(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white outline-none font-bold text-blue-600 focus:border-blue-500"
              >
                <option value="PR">PR - ใบขอซื้อ (Purchase Requisition)</option>
                <option value="PO">PO - ใบสั่งซื้อ (Purchase Order)</option>
                <option value="GRN">GRN - ใบรับสินค้า (Goods Received Note)</option>
                <option value="QUOTATION">QUOTATION - ใบเสนอราคา</option>
                <option value="SO">SO - ใบสั่งขาย (Sales Order)</option>
                <option value="DELIVERY_NOTE">DN - ใบส่งสินค้า (Delivery Note)</option>
                <option value="STOCK_ISSUE">ISSUE - ใบเบิกสินค้า</option>
                <option value="STOCK_TRANSFER">TRANSFER - ใบโอนสินค้า</option>
                <option value="STOCK_ADJUSTMENT">ADJUST - ใบปรับสต็อก</option>
                <option value="INVOICE">INV - ใบแจ้งหนี้</option>
                <option value="RECEIPT">RC - ใบเสร็จรับเงิน</option>
              </select>
            </div>

            {['PO', 'GRN', 'PR'].includes(documentType) && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700">เลือกซัพพลายเออร์ / คู่ค้า *</label>
                  <button
                    type="button"
                    onClick={() => openQuickAddModal('SUPPLIER')}
                    className="text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-0.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ เพิ่มซัพพลายเออร์</span>
                  </button>
                </div>
                <select
                  value={supplierId}
                  onChange={(e) => setSupplierId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white outline-none font-medium"
                >
                  <option value="">-- เลือกซัพพลายเออร์ --</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.code} - {s.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {['QUOTATION', 'SO', 'INVOICE', 'RECEIPT', 'DELIVERY_NOTE'].includes(documentType) && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700">เลือกลูกค้า / ผู้สั่งซื้อ *</label>
                  <button
                    type="button"
                    onClick={() => openQuickAddModal('CUSTOMER')}
                    className="text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-0.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ เพิ่มลูกค้าใหม่</span>
                  </button>
                </div>
                <select
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white outline-none font-medium"
                >
                  <option value="">-- เลือกลูกค้า --</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.code} - {c.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">คลังสินค้าต้นทาง *</label>
              <select
                value={warehouseId}
                onChange={(e) => setWarehouseId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white outline-none font-medium"
              >
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.code} - {w.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Table Items */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">ตารางรายการสินค้า (Document Items)</h3>
              <button
                type="button"
                onClick={handleAddItem}
                className="text-xs text-blue-600 hover:underline font-semibold flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ เพิ่มรายการสินค้า</span>
              </button>
            </div>

            <div className="border border-slate-200 rounded-lg overflow-visible bg-white">
              <table className="w-full text-left text-sm overflow-visible">
                <thead className="bg-slate-50 text-slate-500 text-xs border-b border-slate-200">
                  <tr>
                    <th className="p-3">สินค้า (มีช่องค้นหา SKU/บาร์โค้ด/ชื่อสินค้า) *</th>
                    <th className="p-3 w-28 text-right">จำนวน *</th>
                    <th className="p-3 w-32 text-right">ราคา/หน่วย (฿)</th>
                    <th className="p-3 w-28 text-right">ส่วนลด (฿)</th>
                    <th className="p-3 w-36 text-right">ยอดรวม (฿)</th>
                    <th className="p-3 w-12 text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 overflow-visible">
                  {items.map((item, idx) => {
                    const rowTotal = item.quantity * item.unitPrice - item.discount;
                    const rowZIndex = items.length - idx + 10;

                    return (
                      <tr key={idx} style={{ position: 'relative', zIndex: rowZIndex }}>
                        <td className="p-2 min-w-[300px]">
                          <SearchableProductSelect
                            products={products}
                            value={item.productId}
                            onChange={(val) => handleItemChange(idx, 'productId', val)}
                            required
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="number"
                            min="1"
                            required
                            value={item.quantity}
                            onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                            className="w-full px-2 py-1.5 border border-slate-300 rounded text-xs text-right font-mono outline-none focus:border-blue-500"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="number"
                            step="0.01"
                            value={item.unitPrice}
                            onChange={(e) => handleItemChange(idx, 'unitPrice', e.target.value)}
                            className="w-full px-2 py-1.5 border border-slate-300 rounded text-xs text-right font-mono outline-none focus:border-blue-500"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="number"
                            step="0.01"
                            value={item.discount}
                            onChange={(e) => handleItemChange(idx, 'discount', e.target.value)}
                            className="w-full px-2 py-1.5 border border-slate-300 rounded text-xs text-right font-mono outline-none focus:border-blue-500"
                          />
                        </td>
                        <td className="p-3 text-right font-mono font-bold text-xs text-slate-800">
                          ฿{rowTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                        <td className="p-2 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(idx)}
                            className="text-slate-400 hover:text-rose-600 transition-all"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Summary & Notes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-100">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">หมายเหตุเพิ่มเติม (Notes)</label>
              <textarea
                rows={4}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="ระบุเงื่อนไขการชำระเงิน นโยบายการรับประกันสินค้า..."
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs outline-none focus:border-blue-500"
              />
            </div>

            <div className="bg-slate-50 p-4 rounded-xl space-y-2 border border-slate-200/80 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>ยอดรวมสินค้า (Subtotal):</span>
                <span className="font-mono font-bold">฿{subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>

              <div className="flex items-center justify-between gap-4">
                <span className="text-slate-600">ส่วนลดการค้า (Discount):</span>
                <div className="flex items-center gap-1">
                  <span>฿</span>
                  <input
                    type="number"
                    step="0.01"
                    value={discount}
                    onChange={(e) => setDiscount(e.target.value)}
                    className="w-24 px-2 py-1 border border-slate-300 rounded text-right font-mono font-bold text-rose-600"
                  />
                </div>
              </div>

              <div className="flex justify-between text-slate-600 pt-1 border-t border-slate-200">
                <span className="font-bold text-slate-900 text-sm">ยอดเงินรวมทั้งสิ้น (Grand Total):</span>
                <span className="font-mono font-black text-blue-600 text-base">
                  ฿{grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <Link
              href="/documents"
              className="px-5 py-2.5 border border-slate-300 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-50"
            >
              ยกเลิก
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-xs transition-all flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{loading ? 'กำลังออกเอกสาร...' : 'ยืนยันออกเอกสาร'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Quick Add Partner / Customer Modal */}
      {showPartnerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <h3 className="font-bold text-base flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-blue-400" />
                <span>{partnerType === 'CUSTOMER' ? 'เพิ่มข้อมูลลูกค้าใหม่' : 'เพิ่มซัพพลายเออร์ใหม่'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowPartnerModal(false)}
                className="text-slate-400 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreatePartner} className="p-6 space-y-4 text-xs">
              {partnerModalError && (
                <div className="bg-rose-50 border border-rose-200 text-rose-700 p-3 rounded-lg flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{partnerModalError}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">รหัส {partnerType === 'CUSTOMER' ? 'ลูกค้า' : 'ซัพพลายเออร์'} *</label>
                  <input
                    type="text"
                    required
                    value={partnerCode}
                    onChange={(e) => setPartnerCode(e.target.value.toUpperCase())}
                    placeholder="เช่น CUST-001"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none font-mono uppercase focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">เลขประจำตัวผู้เสียภาษี (13 หลัก)</label>
                  <input
                    type="text"
                    maxLength={13}
                    value={partnerTaxId}
                    onChange={(e) => setPartnerTaxId(e.target.value)}
                    placeholder="เลขผู้เสียภาษี..."
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none font-mono focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">ชื่อ {partnerType === 'CUSTOMER' ? 'ลูกค้า / บริษัทผู้สั่งซื้อ' : 'ซัพพลายเออร์ / ร้านค้า'} *</label>
                <input
                  type="text"
                  required
                  value={partnerName}
                  onChange={(e) => setPartnerName(e.target.value)}
                  placeholder="เช่น บริษัท เอส แอนด์ บี อิเล็กทรอนิกส์ จำกัด หรือ นายสมชาย สายตรง"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none font-bold text-slate-900 focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">ชื่อผู้ติดต่อ</label>
                  <input
                    type="text"
                    value={partnerContactPerson}
                    onChange={(e) => setPartnerContactPerson(e.target.value)}
                    placeholder="ชื่อผู้ติดต่อ..."
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">เบอร์โทรศัพท์</label>
                  <input
                    type="text"
                    value={partnerPhone}
                    onChange={(e) => setPartnerPhone(e.target.value)}
                    placeholder="081-234-5678"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">อีเมล</label>
                  <input
                    type="email"
                    value={partnerEmail}
                    onChange={(e) => setPartnerEmail(e.target.value)}
                    placeholder="contact@company.com"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">ที่อยู่ (ที่อยู่ออกใบกำกับภาษี / ที่อยู่จัดส่ง)</label>
                <textarea
                  rows={2}
                  value={partnerAddress}
                  onChange={(e) => setPartnerAddress(e.target.value)}
                  placeholder="ระบุที่อยู่ เลขที่ ถนน แขวง/ตำบล เขต/อำเภอ จังหวัด..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:border-blue-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowPartnerModal(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-600 rounded-lg font-semibold hover:bg-slate-50"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={savingPartner}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold shadow-xs flex items-center gap-1"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{savingPartner ? 'กำลังบันทึก...' : 'บันทึกข้อมูล'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
