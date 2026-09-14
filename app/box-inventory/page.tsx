'use client';

import { useEffect, useMemo, useState } from 'react';
import { Boxes, Plus, Search, Trash2, QrCode, Sparkles, MapPin, Package, RefreshCw, ShieldCheck } from 'lucide-react';

type Item = { productId: string; quantity: number; lot?: string; serial?: string };
type Box = { id: string; box_code: string; qr_token: string; name: string; warehouse_id?: string; warehouse_name?: string; location_code?: string; status: string; notes?: string; items: any[] };

const qrUrl = (token: string) => `https://quickchart.io/qr?size=240&margin=2&text=${encodeURIComponent(token)}`;

export default function BoxInventoryPage() {
  const [boxes, setBoxes] = useState<Box[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Box | null>(null);
  const [aiQuestion, setAiQuestion] = useState('');
  const [aiAnswer, setAiAnswer] = useState('');
  const [governance, setGovernance] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ boxCode: '', name: '', warehouseId: '', locationCode: '', notes: '' });
  const [items, setItems] = useState<Item[]>([{ productId: '', quantity: 1 }]);

  async function load() {
    const [b, p, w] = await Promise.all([
      fetch(`/api/box-inventory?search=${encodeURIComponent(search)}`).then(r => r.json()),
      fetch('/api/products').then(r => r.json()),
      fetch('/api/warehouses').then(r => r.json()),
    ]);
    setBoxes(b.data || []);
    setProducts(p.data || p || []);
    setWarehouses(w.data || w || []);
  }
  useEffect(() => { load(); }, [search]);

  const totalUnits = useMemo(() => boxes.reduce((n, b) => n + b.items.reduce((x: number, i: any) => x + Number(i.quantity || 0), 0), 0), [boxes]);

  async function createBox() {
    if (!form.boxCode.trim() || !items.some(i => i.productId && i.quantity > 0)) return;
    setSaving(true);
    const res = await fetch('/api/box-inventory', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, items }) });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) return alert(data.error || 'บันทึกไม่สำเร็จ');
    setShowCreate(false); setForm({ boxCode: '', name: '', warehouseId: '', locationCode: '', notes: '' }); setItems([{ productId: '', quantity: 1 }]); await load();
  }

  async function removeBox(id: string) {
    if (!confirm('ลบกล่องนี้และรายการภายในกล่องหรือไม่?')) return;
    await fetch(`/api/box-inventory?id=${id}`, { method: 'DELETE' });
    setSelected(null); await load();
  }

  async function askAI() {
    if (!aiQuestion.trim()) return;
    setAiAnswer('กำลังค้นหลักฐานและตรวจสอบด้วย FIRE KEEPER...');
    setGovernance(null);
    const res = await fetch('/api/box-inventory/ai', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ q: aiQuestion }) });
    const data = await res.json();
    setAiAnswer(data.answer || data.error || 'ไม่พบคำตอบ');
    setGovernance(data.governance || null);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <Boxes className="w-7 h-7 text-emerald-600 dark:text-emerald-400" />
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Box Inventory + QR + AI</h1>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Physical inventory ที่เชื่อมกับ Evidence และ FIRE KEEPER governance</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold flex items-center gap-2 shadow-xs">
          <Plus className="w-4 h-4" />สร้างกล่อง
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-xl p-4">
          <p className="text-xs text-slate-500 dark:text-slate-400">กล่องทั้งหมด</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{boxes.length}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-xl p-4">
          <p className="text-xs text-slate-500 dark:text-slate-400">หน่วยสินค้าภายในกล่อง</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{totalUnits.toLocaleString()}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-xl p-4">
          <p className="text-xs text-slate-500 dark:text-slate-400">กล่อง Active</p>
          <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">{boxes.filter(b => b.status === 'ACTIVE').length}</p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-xl p-4 flex items-center gap-3">
        <Search className="w-4 h-4 text-slate-400 dark:text-slate-500" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="ค้นหา Box ID, ชื่อกล่อง, ตำแหน่ง..." className="flex-1 outline-none text-sm bg-transparent text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500" />
        <button onClick={load} className="p-2 text-slate-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400"><RefreshCw className="w-4 h-4" /></button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <div className="xl:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
          {boxes.map(box => (
            <button key={box.id} onClick={() => setSelected(box)} className="text-left bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 hover:border-emerald-300 dark:hover:border-emerald-700 hover:shadow-xs transition-all">
              <div className="flex justify-between gap-3">
                <div>
                  <div className="font-mono font-bold text-slate-900 dark:text-white">{box.box_code}</div>
                  <div className="font-semibold text-sm text-slate-800 dark:text-slate-200 mt-1">{box.name}</div>
                </div>
                <img src={qrUrl(box.qr_token)} alt={`QR ${box.box_code}`} className="w-16 h-16 rounded border border-slate-200 dark:border-slate-700 bg-white" />
              </div>
              <div className="mt-4 space-y-1 text-xs text-slate-500 dark:text-slate-400">
                <div className="flex gap-2"><MapPin className="w-3.5 h-3.5" />{box.warehouse_name || 'ไม่ระบุคลัง'} / {box.location_code || 'ไม่ระบุตำแหน่ง'}</div>
                <div className="flex gap-2"><Package className="w-3.5 h-3.5" />{box.items.length} SKU · {box.items.reduce((n: number, i: any) => n + Number(i.quantity || 0), 0)} หน่วย</div>
              </div>
            </button>
          ))}
          {!boxes.length && <div className="md:col-span-2 bg-white dark:bg-slate-900 border border-dashed border-slate-300 dark:border-slate-800 rounded-xl p-10 text-center text-slate-400 dark:text-slate-500">ยังไม่มีกล่อง — กด “สร้างกล่อง” เพื่อเริ่มต้น</div>}
        </div>

        <div className="bg-slate-900 dark:bg-slate-900/90 text-white border border-slate-800 rounded-xl p-5 h-fit shadow-xs">
          <div className="flex items-center gap-2 font-bold"><Sparkles className="w-5 h-5 text-emerald-400" />AI Inventory Assistant</div>
          <p className="text-xs text-slate-400 mt-1">ถาม AI โดยให้ Box Inventory เป็น evidence source และผ่าน governance boundary</p>
          <textarea value={aiQuestion} onChange={e => setAiQuestion(e.target.value)} placeholder="เช่น Adapter อยู่กล่องไหน?" className="mt-4 w-full min-h-24 bg-slate-800 border border-slate-700 rounded-lg p-3 text-sm outline-none text-slate-100 placeholder-slate-500" />
          <button onClick={askAI} className="mt-2 w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-lg text-sm transition-colors">ถาม AI</button>
          {aiAnswer && <pre className="mt-4 whitespace-pre-wrap text-xs leading-6 text-slate-200 font-sans">{aiAnswer}</pre>}
          {governance && <div className="mt-4 border-t border-slate-700 pt-4"><div className="flex items-center gap-2 text-xs font-semibold"><ShieldCheck className="w-4 h-4 text-emerald-400" />FIRE KEEPER Governance</div><div className="mt-2 grid grid-cols-2 gap-2 text-[11px]"><div className="rounded bg-slate-800 p-2">Validation<strong className="block text-emerald-400">{governance.validation?.status}</strong></div><div className="rounded bg-slate-800 p-2">Confidence<strong className="block">{governance.decision?.confidence?.label} · {governance.decision?.confidence?.score}</strong></div></div><p className="mt-2 text-[10px] text-slate-400">Evidence: {governance.evidence?.length || 0} รายการ · Control: {governance.decision?.controlLevel || 'LOW'}</p></div>}
        </div>
      </div>

      {selected && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50" onClick={() => setSelected(null)}>
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-auto p-6 text-slate-900 dark:text-white" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between">
              <div>
                <h2 className="text-xl font-bold font-mono">{selected.box_code}</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">{selected.name}</p>
              </div>
              <img src={qrUrl(selected.qr_token)} alt="QR" className="w-24 h-24 rounded border border-slate-200 dark:border-slate-700 bg-white" />
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-slate-400 dark:text-slate-500">คลัง:</span> {selected.warehouse_name || '-'}</div>
              <div><span className="text-slate-400 dark:text-slate-500">ตำแหน่ง:</span> {selected.location_code || '-'}</div>
            </div>
            <table className="w-full mt-5 text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-left text-slate-500 dark:text-slate-400">
                  <th className="py-2">SKU</th>
                  <th>สินค้า</th>
                  <th className="text-right">จำนวน</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {selected.items.map((i: any) => (
                  <tr key={i.id}>
                    <td className="py-2.5 font-mono text-xs font-bold text-blue-600 dark:text-blue-400">{i.sku}</td>
                    <td className="text-slate-800 dark:text-slate-200">{i.product_name}</td>
                    <td className="text-right font-mono font-bold text-slate-900 dark:text-white">{i.quantity}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button onClick={() => removeBox(selected.id)} className="mt-5 text-rose-600 dark:text-rose-400 text-sm font-semibold flex items-center gap-2 hover:underline">
              <Trash2 className="w-4 h-4" />ลบกล่อง
            </button>
          </div>
        </div>
      )}

      {showCreate && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-auto p-6 shadow-xl">
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
              <h2 className="text-xl font-bold">สร้าง Box Inventory</h2>
              <QrCode className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-5">
              <input className="border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg p-2.5 text-sm outline-none focus:border-emerald-500 font-mono" placeholder="Box ID เช่น BOX-0001" value={form.boxCode} onChange={e => setForm({ ...form, boxCode: e.target.value })} />
              <input className="border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg p-2.5 text-sm outline-none focus:border-emerald-500" placeholder="ชื่อกล่อง" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
              <select className="border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg p-2.5 text-sm outline-none focus:border-emerald-500" value={form.warehouseId} onChange={e => setForm({ ...form, warehouseId: e.target.value })}>
                <option value="">เลือกคลัง</option>
                {warehouses.map(w => <option key={w.id} value={w.id}>{w.code} - {w.name}</option>)}
              </select>
              <input className="border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg p-2.5 text-sm outline-none focus:border-emerald-500" placeholder="ตำแหน่ง เช่น RACK-03" value={form.locationCode} onChange={e => setForm({ ...form, locationCode: e.target.value })} />
            </div>
            <div className="mt-5">
              <div className="font-semibold text-sm text-slate-700 dark:text-slate-300 mb-2">สินค้าในกล่อง</div>
              {items.map((item, idx) => (
                <div key={idx} className="flex gap-2 mb-2">
                  <select className="flex-1 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg p-2.5 text-sm outline-none" value={item.productId} onChange={e => setItems(items.map((x, j) => j === idx ? { ...x, productId: e.target.value } : x))}>
                    <option value="">เลือกสินค้า</option>
                    {products.map(p => <option key={p.id} value={p.id}>{p.sku} - {p.name}</option>)}
                  </select>
                  <input type="number" min="0.01" className="w-24 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono font-bold rounded-lg p-2.5 text-sm outline-none" value={item.quantity} onChange={e => setItems(items.map((x, j) => j === idx ? { ...x, quantity: Number(e.target.value) } : x))} />
                  <button onClick={() => setItems(items.filter((_, j) => j !== idx))} className="p-2 text-rose-500 hover:text-rose-600"><Trash2 className="w-4 h-4" /></button>
                </div>
              ))}
              <button onClick={() => setItems([...items, { productId: '', quantity: 1 }])} className="text-emerald-600 dark:text-emerald-400 text-sm font-semibold hover:underline">+ เพิ่มสินค้า</button>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button onClick={() => setShowCreate(false)} className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-600 dark:text-slate-400 font-semibold hover:bg-slate-50 dark:hover:bg-slate-800">ยกเลิก</button>
              <button disabled={saving} onClick={createBox} className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold shadow-xs">{saving ? 'กำลังบันทึก...' : 'สร้างกล่อง + QR'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
