'use client';

import React, { useState, useEffect } from 'react';
import { ArrowLeftRight, CheckCircle2, AlertCircle } from 'lucide-react';
import ConfirmationModal from '@/components/common/ConfirmationModal';
import { useRouter } from 'next/navigation';
import { useRole } from '@/components/context/RoleContext';

export default function StockTransferPage() {
  const { currentRole } = useRole();
  const [products, setProducts] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [productId, setProductId] = useState('');
  const [sourceWarehouseId, setSourceWarehouseId] = useState('');
  const [destinationWarehouseId, setDestinationWarehouseId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [reference, setReference] = useState('');
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
        if (whData && whData.length >= 2) {
          setSourceWarehouseId(whData[0].id);
          setDestinationWarehouseId(whData[1].id);
        }
      } catch (e) {
        console.error(e);
      }
    }
    loadOptions();
  }, []);

  const selectedProdObj = products.find((p) => p.id === productId);
  const sourceWhObj = warehouses.find((w) => w.id === sourceWarehouseId);
  const destWhObj = warehouses.find((w) => w.id === destinationWarehouseId);

  const handlePreConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!productId || !sourceWarehouseId || !destinationWarehouseId || !quantity || parseInt(quantity) <= 0) {
      setErrorMsg('กรุณากรอกข้อมูลสินค้า คลังต้นทาง คลังปลายทาง และจำนวนให้ถูกต้อง');
      return;
    }

    if (sourceWarehouseId === destinationWarehouseId) {
      setErrorMsg('คลังสินค้าต้นทางและปลายทางต้องเป็นคนละคลังกัน');
      return;
    }

    setConfirming(true);
  };

  const handleExecuteTransfer = async () => {
    setLoading(true);
    setErrorMsg('');

    try {
      const res = await fetch('/api/stock/transfer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': currentRole || 'ADMIN',
        },
        body: JSON.stringify({
          productId,
          sourceWarehouseId,
          destinationWarehouseId,
          quantity: parseInt(quantity),
          reference,
          note,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Stock Transfer failed');
      }

      setSuccessTx({
        transactionId: data.transactionId,
        message: `โอนสินค้า ${data.product.name} จำนวน ${data.quantity} ชิ้น จากคลัง ${data.sourceWarehouse.code} ไปยังคลัง ${data.destWarehouse.code} เรียบร้อยแล้ว (Atomic Transaction)`,
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
          <ArrowLeftRight className="w-7 h-7 text-blue-600" />
          <span>ระบบโอนสินค้าระหว่างคลัง (Stock Transfer System)</span>
        </h1>
        <p className="text-sm text-slate-500 mt-1">โอนสินค้าระหว่างคลังสินค้าแบบ Atomic Transaction คลังต้นทางลดลง คลังปลายทางเพิ่มขึ้นพร้อมกัน</p>
      </div>

      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
        <form onSubmit={handlePreConfirm} className="space-y-4">
          {errorMsg && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 p-3.5 rounded-lg text-sm flex items-start gap-2.5">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <span className="font-semibold">{errorMsg}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">คลังสินค้าต้นทาง (Source) *</label>
              <select
                required
                value={sourceWarehouseId}
                onChange={(e) => setSourceWarehouseId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white outline-none focus:border-blue-500"
              >
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.code} - {w.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">คลังสินค้าปลายทาง (Destination) *</label>
              <select
                required
                value={destinationWarehouseId}
                onChange={(e) => setDestinationWarehouseId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white outline-none focus:border-blue-500"
              >
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.code} - {w.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">เลือกสินค้าที่จะโอน *</label>
              <select
                required
                value={productId}
                onChange={(e) => setProductId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white outline-none focus:border-blue-500"
              >
                <option value="">-- เลือกสินค้า --</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.sku} - {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">จำนวนที่โอน *</label>
              <input
                type="number"
                min="1"
                required
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="30"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none font-mono focus:border-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">เอกสารอ้างอิง (Transfer Order)</label>
              <input
                type="text"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="เช่น TR-2026-0030"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">หมายเหตุ</label>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="เช่น โอนสินค้าเติมสต็อกสาขา"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-end">
            <button
              type="submit"
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg text-sm shadow-xs transition-all flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>ตรวจสอบและยืนยันการโอนสินค้า</span>
            </button>
          </div>
        </form>
      </div>

      {confirming && (
        <ConfirmationModal
          title="ยืนยันการโอนสินค้าระหว่างคลัง?"
          details={[
            { label: 'สินค้า', value: `${selectedProdObj?.sku} - ${selectedProdObj?.name}` },
            { label: 'คลังต้นทาง (Source)', value: `${sourceWhObj?.code} - ${sourceWhObj?.name}` },
            { label: 'คลังปลายทาง (Destination)', value: `${destWhObj?.code} - ${destWhObj?.name}` },
            { label: 'จำนวนที่โอน', value: `${quantity} ${selectedProdObj?.unit || 'ชิ้น'}` },
            { label: 'เอกสารอ้างอิง', value: reference || '-' },
          ]}
          confirmText="ยืนยันทำรายการ Transfer"
          isLoading={loading}
          successResult={successTx}
          onConfirm={handleExecuteTransfer}
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
