'use client';

export const dynamic = 'force-dynamic';

import React, { useState, useEffect, Suspense } from 'react';
import { ArrowDownRight, CheckCircle2, AlertCircle } from 'lucide-react';
import ConfirmationModal from '@/components/common/ConfirmationModal';
import { useRouter, useSearchParams } from 'next/navigation';
import { useRole } from '@/components/context/RoleContext';
import SearchableProductSelect from '@/components/common/SearchableProductSelect';

function StockInForm() {
  const { currentRole } = useRole();
  const [products, setProducts] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [productId, setProductId] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [costPrice, setCostPrice] = useState('');
  const [lotNumber, setLotNumber] = useState('');
  const [reference, setReference] = useState('');
  const [reason, setReason] = useState('');

  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successTx, setSuccessTx] = useState<{ transactionId: string; message: string } | null>(null);

  const router = useRouter();
  const searchParams = useSearchParams();
  const initialProdId = searchParams.get('productId');

  useEffect(() => {
    async function loadOptions() {
      try {
        const [prodRes, whRes] = await Promise.all([
          fetch('/api/products?limit=2000'),
          fetch('/api/warehouses'),
        ]);
        const prodData = await prodRes.json();
        const whData = await whRes.json();

        const rawProductsList = Array.isArray(prodData)
          ? prodData
          : prodData.data || prodData.products || [];
        setProducts(Array.isArray(rawProductsList) ? rawProductsList : []);
        setWarehouses(whData || []);

        if (whData && whData.length > 0) setWarehouseId(whData[0].id);
        if (initialProdId) setProductId(initialProdId);
      } catch (e) {
        console.error(e);
      }
    }
    loadOptions();
  }, [initialProdId]);

  const selectedProdObj = products.find((p) => p.id === productId);
  const selectedWhObj = warehouses.find((w) => w.id === warehouseId);

  const handlePreConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    if (!productId || !warehouseId || !quantity || parseInt(quantity) <= 0) {
      setErrorMsg('กรุณากรอกข้อมูลสินค้า คลัง และจำนวนให้ถูกต้อง');
      return;
    }
    setConfirming(true);
  };

  const handleExecuteStockIn = async () => {
    setLoading(true);
    setErrorMsg('');

    try {
      const res = await fetch('/api/stock/in', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': currentRole || 'ADMIN',
        },
        body: JSON.stringify({
          productId,
          warehouseId,
          quantity: parseInt(quantity),
          costPrice: costPrice ? parseFloat(costPrice) : undefined,
          lotNumber,
          reference,
          reason,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Stock In failed');
      }

      setSuccessTx({
        transactionId: data.transactionId,
        message: `รับสินค้า ${data.product.name} จำนวน ${data.quantity} ชิ้น เข้าคลัง ${data.warehouse.code} เรียบร้อยแล้ว`,
      });
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
      setConfirming(false);
    }
  };

  if (successTx) {
    return (
      <div className="max-w-md mx-auto bg-white p-8 rounded-2xl border border-slate-200 shadow-lg text-center space-y-4 animate-in zoom-in-95 duration-200">
        <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-10 h-10" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">ทำรายการรับสินค้าเข้าสำเร็จ!</h2>
        <p className="text-sm text-slate-600">{successTx.message}</p>
        <div className="p-3 bg-slate-50 rounded-lg text-xs font-mono text-slate-500">
          Tx ID: {successTx.transactionId}
        </div>
        <div className="flex gap-2 pt-2">
          <button
            onClick={() => {
              setSuccessTx(null);
              setQuantity('');
              setCostPrice('');
              setReason('');
            }}
            className="flex-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg"
          >
            ทำรายการรับเข้าเพิ่ม
          </button>
          <button
            onClick={() => router.push('/inventory')}
            className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 text-xs font-semibold rounded-lg"
          >
            ดูคลังสินค้า
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in duration-200">
      <div className="border-b border-slate-200 pb-5">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <ArrowDownRight className="w-7 h-7 text-emerald-600" />
          <span>รับสินค้าเข้าคลัง (Stock Receive / Stock In)</span>
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          บันทึกการรับสินค้าเข้าสต็อก เพิ่มจำนวนคงเหลือ และคำนวณราคาทุนเฉลี่ยถ่วงน้ำหนัก (AVCO)
        </p>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <form onSubmit={handlePreConfirm} className="space-y-4 text-xs">
          {errorMsg && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 p-3 rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div>
            <label className="block font-semibold text-slate-700 mb-1">เลือกสินค้า (มีช่องค้นหา SKU/บาร์โค้ด/ชื่อสินค้า) *</label>
            <SearchableProductSelect
              products={products}
              value={productId}
              onChange={(val) => setProductId(val)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">เลือกคลังสินค้า *</label>
              <select
                required
                value={warehouseId}
                onChange={(e) => setWarehouseId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white font-medium outline-none focus:border-emerald-500"
              >
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.code} - {w.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">จำนวนที่รับเข้า *</label>
              <input
                type="number"
                min="1"
                required
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="ระบุจำนวน"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-900 outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">ราคาทุนต่อหน่วย (฿)</label>
              <input
                type="number"
                step="0.01"
                value={costPrice}
                onChange={(e) => setCostPrice(e.target.value)}
                placeholder={selectedProdObj ? `ทุนเดิม: ฿${selectedProdObj.costPrice}` : 'ระบุราคาทุน'}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono text-slate-900 outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">เลขล็อต (Lot / Batch No.)</label>
              <input
                type="text"
                value={lotNumber}
                onChange={(e) => setLotNumber(e.target.value)}
                placeholder="เช่น LOT-202608-01"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">เลขที่เอกสารอ้างอิง (Ref No.)</label>
            <input
              type="text"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="เช่น PO-2026-000001, INV-8899"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">เหตุผลการรับเข้า</label>
            <textarea
              rows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="ระบุเหตุผล เช่น รับเข้าสินค้าจากการสั่งซื้อใหม่..."
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs outline-none focus:border-emerald-500"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs transition-all flex items-center justify-center gap-2"
            >
              <ArrowDownRight className="w-4 h-4" />
              <span>ยืนยันการรับสินค้าเข้าสต็อก</span>
            </button>
          </div>
        </form>
      </div>

      {/* Confirmation Modal */}
      {confirming && selectedProdObj && selectedWhObj && (
        <ConfirmationModal
          title="ยืนยันการรับสินค้าเข้าคลัง"
          details={[
            { label: 'สินค้า', value: `[${selectedProdObj.sku}] ${selectedProdObj.name}` },
            { label: 'คลังสินค้า', value: selectedWhObj.name },
            { label: 'จำนวนรับเข้า', value: `${quantity} ${selectedProdObj.unit || 'ชิ้น'}` },
          ]}
          confirmText="ยืนยันรับสินค้าเข้า"
          isLoading={loading}
          onConfirm={handleExecuteStockIn}
          onClose={() => setConfirming(false)}
        />
      )}
    </div>
  );
}

export default function StockInPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-400">กำลังโหลด...</div>}>
      <StockInForm />
    </Suspense>
  );
}
