'use client';

import React, { useState, useEffect } from 'react';
import { Sliders, CheckCircle2, AlertCircle } from 'lucide-react';
import ConfirmationModal from '@/components/common/ConfirmationModal';
import { useRouter } from 'next/navigation';
import { useRole } from '@/components/context/RoleContext';

export default function StockAdjustmentPage() {
  const { currentRole } = useRole();
  const [products, setProducts] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [productId, setProductId] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [currentStock, setCurrentStock] = useState<number | null>(null);
  const [actualStock, setActualStock] = useState('');
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');

  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successTx, setSuccessTx] = useState<{ transactionId: string; message: string } | null>(null);

  const router = useRouter();

  useEffect(() => {
    async function loadOptions() {
      try {
        const [prodRes, whRes] = await Promise.all([
          fetch('/api/products?limit=100'),
          fetch('/api/warehouses'),
        ]);
        const prodData = await prodRes.json();
        const whData = await whRes.json();

        setProducts(prodData.data || []);
        setWarehouses(whData || []);
        if (whData && whData.length > 0) setWarehouseId(whData[0].id);
      } catch (e) {
        console.error(e);
      }
    }
    loadOptions();
  }, []);

  useEffect(() => {
    if (!productId || !warehouseId) {
      setCurrentStock(null);
      return;
    }

    async function fetchStock() {
      try {
        const res = await fetch(`/api/inventory?warehouseId=${warehouseId}&search=${productId}`);
        const data = await res.json();
        if (data.data && data.data.length > 0) {
          const matched = data.data.find((i: any) => i.productId === productId);
          setCurrentStock(matched ? matched.onHand : 0);
        } else {
          setCurrentStock(0);
        }
      } catch (e) {
        console.error(e);
      }
    }
    fetchStock();
  }, [productId, warehouseId]);

  const selectedProdObj = products.find((p) => p.id === productId);
  const selectedWhObj = warehouses.find((w) => w.id === warehouseId);

  const delta = actualStock !== '' && currentStock !== null ? parseInt(actualStock) - currentStock : 0;

  const handlePreConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!productId || !warehouseId || actualStock === '') {
      setErrorMsg('กรุณากรอกข้อมูลสินค้า คลังสินค้า และยอดตรวจนับจริงให้ถูกต้อง');
      return;
    }

    if (!reason || reason.trim().length === 0) {
      setErrorMsg('ข้อบังคับ: ต้องระบุเหตุผลในการปรับยอดสต็อกทุกครั้ง (Reason is required)');
      return;
    }

    if (parseInt(actualStock) < 0) {
      setErrorMsg('ยอดตรวจนับจริงต้องไม่ติดลบ');
      return;
    }

    setConfirming(true);
  };

  const handleExecuteAdjustment = async () => {
    setLoading(true);
    setErrorMsg('');

    try {
      const res = await fetch('/api/stock/adjustment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': currentRole || 'ADMIN',
        },
        body: JSON.stringify({
          productId,
          warehouseId,
          actualStock: parseInt(actualStock),
          reason,
          note,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Stock Adjustment failed');
      }

      setSuccessTx({
        transactionId: data.transactionId,
        message: `ปรับยอดสินค้า ${data.product.name} ในคลัง ${data.warehouse.code} จาก ${data.currentStock} เป็น ${data.actualStock} (ส่วนต่าง ${data.adjustmentQty >= 0 ? `+${data.adjustmentQty}` : data.adjustmentQty}) เรียบร้อยแล้ว`,
      });
    } catch (err: any) {
      setErrorMsg(err.message);
      setConfirming(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in duration-200">
      <div className="border-b border-slate-200 pb-5">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <Sliders className="w-7 h-7 text-amber-600" />
          <span>ระบบปรับยอดสต็อก (Stock Adjustment System)</span>
        </h1>
        <p className="text-sm text-slate-500 mt-1">ปรับยอดสินค้าจากการตรวจนับจริง สินค้าเสียหาย หรือสูญหาย โดยต้องระบุเหตุผลและสร้าง Audit Log ทุกครั้ง</p>
      </div>

      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
        <form onSubmit={handlePreConfirm} className="space-y-4">
          {errorMsg && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 p-3.5 rounded-lg text-sm flex items-start gap-2.5">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <span className="font-semibold">{errorMsg}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">เลือกคลังสินค้า *</label>
              <select
                required
                value={warehouseId}
                onChange={(e) => setWarehouseId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white outline-none focus:border-amber-500"
              >
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.code} - {w.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">เลือกสินค้า *</label>
              <select
                required
                value={productId}
                onChange={(e) => setProductId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white outline-none focus:border-amber-500"
              >
                <option value="">-- เลือกสินค้า --</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.sku} - {p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200 text-center">
            <div>
              <p className="text-xs text-slate-500 font-semibold uppercase">Current Stock ในระบบ</p>
              <p className="text-lg font-bold text-slate-800 mt-1">
                {currentStock !== null ? `${currentStock} ชิ้น` : '-'}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500 font-semibold uppercase">ยอดตรวจนับจริง (Actual Stock) *</p>
              <input
                type="number"
                min="0"
                required
                value={actualStock}
                onChange={(e) => setActualStock(e.target.value)}
                placeholder="48"
                className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm text-center font-bold font-mono outline-none focus:border-amber-500 mt-1 bg-white"
              />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-semibold uppercase">จำนวนปรับยอด (Delta)</p>
              <p
                className={`text-lg font-bold font-mono mt-1 ${
                  delta > 0 ? 'text-emerald-600' : delta < 0 ? 'text-rose-600' : 'text-slate-600'
                }`}
              >
                {delta > 0 ? `+${delta}` : delta} ชิ้น
              </p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              เหตุผลในการปรับยอด (Reason) <span className="text-rose-600 font-bold">* บังคับกรอก</span>
            </label>
            <select
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white outline-none focus:border-amber-500 mb-2"
            >
              <option value="">-- เลือกเหตุผลการปรับยอด --</option>
              <option value="ตรวจนับจริงแล้วไม่ตรง (Physical Count Discrepancy)">ตรวจนับจริงแล้วไม่ตรง (Physical Count Discrepancy)</option>
              <option value="สินค้าเสียหาย (Damaged Item)">สินค้าเสียหาย (Damaged Item)</option>
              <option value="สูญหาย (Lost / Stolen)">สูญหาย (Lost / Stolen)</option>
              <option value="พบสินค้าจริงเพิ่ม (Found Stock)">พบสินค้าจริงเพิ่ม (Found Stock)</option>
              <option value="แก้ไขความผิดพลาดจากการบันทึก (Correction)">แก้ไขความผิดพลาดจากการบันทึก (Correction)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">หมายเหตุเพิ่มเติม (Note)</label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="รายละเอียดเพิ่มเติม เช่น ลังบุบจากการขนส่ง 2 ชิ้น"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:border-amber-500"
            />
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-end">
            <button
              type="submit"
              className="px-6 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-lg text-sm shadow-xs transition-all flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>ตรวจสอบและยืนยันการปรับยอด</span>
            </button>
          </div>
        </form>
      </div>

      {confirming && (
        <ConfirmationModal
          title="ยืนยันการปรับยอดสต็อก?"
          details={[
            { label: 'สินค้า', value: `${selectedProdObj?.sku} - ${selectedProdObj?.name}` },
            { label: 'คลังสินค้า', value: `${selectedWhObj?.code} - ${selectedWhObj?.name}` },
            { label: 'Stock ในระบบก่อนปรับ', value: `${currentStock} ชิ้น` },
            { label: 'Stock จริงหลังปรับ', value: `${actualStock} ชิ้น` },
            { label: 'ส่วนต่าง (Adjustment Qty)', value: `${delta > 0 ? `+${delta}` : delta} ชิ้น` },
            { label: 'เหตุผลบังคับ (Reason)', value: reason },
          ]}
          confirmText="ยืนยันทำรายการ Adjustment"
          isLoading={loading}
          successResult={successTx}
          onConfirm={handleExecuteAdjustment}
          onClose={() => {
            setConfirming(false);
            setSuccessTx(null);
            if (successTx) router.push('/inventory');
          }}
          onViewTransaction={(txId) => router.push(`/movements?search=${txId}`)}
        />
      )}
    </div>
  );
}
