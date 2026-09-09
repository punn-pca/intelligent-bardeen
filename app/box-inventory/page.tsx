'use client';

import { useEffect, useMemo, useState } from 'react';
import { Boxes, Plus, Search, Trash2, QrCode, Sparkles, MapPin, Package, RefreshCw } from 'lucide-react';

const qrUrl = (token: string) => `https://quickchart.io/qr?size=240&margin=2&text=${encodeURIComponent(token)}`;

type Item = { productId: string; quantity: number; lot?: string; serial?: string };

type Box = {
  id: string; box_code: string; qr_token: string; name: string; warehouse_id?: string;
  warehouse_name?: string; location_code?: string; status: string; notes?: string; items: any[];
};

export default function BoxInventoryPage() {
  const [boxes, setBoxes] = useState<Box[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Box | null>(null);
  const [aiQuestion, setAiQuestion] = useState('');
  const [aiAnswer, setAiAnswer] = useState('');
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
    setAiAnswer('กำลังค้นหลักฐาน...');
    const res = await fetch('/api/box-inventory/ai', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ q: aiQuestion }) });
    const data = await res.json();
    setAiAnswer(data.answer || data.error || 'ไม่พบคำตอบ');
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2"><Boxes className="w-7 h-7 text-emerald-600" /><h1 className="text-2xl font-bold text-slate-900">Box Inventory + QR + AI</h1></div>
          <p className="text-sm text-slate-500 mt-1">ผูกกล่องจริงกับ Inventory ด้วย Box ID / QR และค้นหาด้วยหลักฐานจากข้อมูลจริง</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold flex items-center gap-2"><Plus className="w-4 h-4" />สร้างกล่อง</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4"><p className="text-xs text-slate-500">กล่องทั้งหมด</p><p className="text-2xl font-bold mt-1">{boxes.length}</p></div>
        <div className="bg-white border border-slate-200 rounded-xl p-4"><p className="text-xs text-slate-500">หน่วยสินค้าภายในกล่อง</p><p className="text-2xl font-bold mt-1">{totalUnits.toLocaleString()}</p></div>
        <div className="bg-white border border-slate-200 rounded-xl p-4"><p className="text-xs text-slate-500">กล่อง Active</p><p className="text-2xl font-bold text-emerald-600 mt-1">{boxes.filter(b => b.status === 'ACTIVE').length}</p></div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-center gap-3"><Search className="w-4 h-4 text-slate-400" /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="ค้นหา Box ID, ชื่อกล่อง, ตำแหน่ง..." className="flex-1 outline-none text-sm" /><button onClick={load} className="p-2 text-slate-500 hover:text-emerald-600"><RefreshCw className="w-4 h-4" /></button></div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <div className="xl:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
          {boxes.map(box => (
            <button key={box.id} onClick={() => setSelected(box)} className="text-left bg-white border border-slate-200 rounded-xl p-5 hover:border-emerald-300 hover:shadow-sm transition-all">
              <div className="flex justify-between gap-3"><div><div className="font-mono font-bold text-slate-900">{box.box_code}</div><div className="font-semibold text-sm mt-1">{box.name}</div></div><img src={qrUrl(box.qr_token)} alt={`QR ${box.box_code}`} className="w-16 h-16 rounded border" /></div>
              <div className="mt-4 space-y-1 text-xs text-slate-500"><div className="flex gap-2"><MapPin className="w-3.5 h-3.5" />{box.warehouse_name || 'ไม่ระบุคลัง'} / {box.location_code || 'ไม่ระบุตำแหน่ง'}</div><div className="flex gap-2"><Package className="w-3.5 h-3.5" />{box.items.length} SKU · {box.items.reduce((n: number, i: any) => n + Number(i.quantity || 0), 0)} หน่วย</div></div>
            </button>
          ))}
          {!boxes.length && <div className="md:col-span-2 bg-white border border-dashed border-slate-300 rounded-xl p-10 text-center text-slate-400">ยังไม่มีกล่อง — กด “สร้างกล่อง” เพื่อเริ่มต้น</div>}
        </div>

        <div className="bg-slate-900 text-white rounded-xl p-5 h-fit">
          <div className="flex items-center gap-2 font-bold"><Sparkles className="w-5 h-5" />AI Inventory Assistant</div>
          <p className="text-xs text-slate-400 mt-1">ค้นจาก Box Inventory ก่อนตอบ และส่งหลักฐานให้ Ollama ได้ถ้าตั้งค่า OLLAMA_BASE_URL / OLLAMA_MODEL</p>
          <textarea value={aiQuestion} onChange={e => setAiQuestion(e.target.value)} placeholder="เช่น Adapter อยู่กล่องไหน?" className="mt-4 w-full min-h-24 bg-slate-800 border border-slate-700 rounded-lg p-3 text-sm outline-none" />
          <button onClick={askAI} className="mt-2 w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 rounded-lg text-sm font-semibold">ถาม AI</button>
          {aiAnswer && <pre className="mt-4 whitespace-pre-wrap text-xs leading-6 text-slate-200 font-sans">{aiAnswer}</pre>}
        </div>
      </div>

      {selected && <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50" onClick={() => setSelected(null)}><div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-auto p-6" onClick={e => e.stopPropagation()}><div className="flex justify-between"><div><h2 className="text-xl font-bold">{selected.box_code}</h2><p className="text-sm text-slate-500">{selected.name}</p></div><img src={qrUrl(selected.qr_token)} alt="QR" className="w-28 h-28" /></div><div className="mt-5 grid grid-cols-2 gap-3 text-sm"><div><span className="text-slate-400">คลัง:</span> {selected.warehouse_name || '-'}</div><div><span className="text-slate-400">ตำแหน่ง:</span> {selected.location_code || '-'}</div></div><table className="w-full mt-5 text-sm"><thead><tr className="border-b text-left"><th className="py-2">SKU</th><th>สินค้า</th><th className="text-right">จำนวน</th></tr></thead><tbody>{selected.items.map((i: any) => <tr key={i.id} className="border-b"><td className="py-2 font-mono">{i.sku}</td><td>{i.product_name}</td><td className="text-right font-semibold">{i.quantity}</td></tr>)}</tbody></table><button onClick={() => removeBox(selected.id)} className="mt-5 text-rose-600 text-sm flex items-center gap-2"><Trash2 className="w-4 h-4" />ลบกล่อง</button></div></div>}

      {showCreate && <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50"><div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-auto p-6"><div className="flex justify-between items-center"><h2 className="text-xl font-bold">สร้าง Box Inventory</h2><QrCode className="w-6 h-6 text-emerald-600" /></div><div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-5"><input className="border rounded-lg p-2.5 text-sm" placeholder="Box ID เช่น BOX-0001" value={form.boxCode} onChange={e => setForm({ ...form, boxCode: e.target.value })} /><input className="border rounded-lg p-2.5 text-sm" placeholder="ชื่อกล่อง" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /><select className="border rounded-lg p-2.5 text-sm" value={form.warehouseId} onChange={e => setForm({ ...form, warehouseId: e.target.value })}><option value="">เลือกคลัง</option>{warehouses.map(w => <option key={w.id} value={w.id}>{w.code} - {w.name}</option>)}</select><input className="border rounded-lg p-2.5 text-sm" placeholder="ตำแหน่ง เช่น RACK-03" value={form.locationCode} onChange={e => setForm({ ...form, locationCode: e.target.value })} /></div><div className="mt-5"><div className="font-semibold text-sm mb-2">สินค้าในกล่อง</div>{items.map((item, idx) => <div key={idx} className="flex gap-2 mb-2"><select className="flex-1 border rounded-lg p-2.5 text-sm" value={item.productId} onChange={e => setItems(items.map((x, j) => j === idx ? { ...x, productId: e.target.value } : x))}><option value="">เลือกสินค้า</option>{products.map(p => <option key={p.id} value={p.id}>{p.sku} - {p.name}</option>)}</select><input type="number" min="0.01" className="w-24 border rounded-lg p-2.5 text-sm" value={item.quantity} onChange={e => setItems(items.map((x, j) => j === idx ? { ...x, quantity: Number(e.target.value) } : x))} /><button onClick={() => setItems(items.filter((_, j) => j !== idx))} className="p-2 text-rose-500"><Trash2 className="w-4 h-4" /></button></div>)}<button onClick={() => setItems([...items, { productId: '', quantity: 1 }])} className="text-emerald-600 text-sm font-semibold">+ เพิ่มสินค้า</button></div><div className="flex justify-end gap-2 mt-6"><button onClick={() => setShowCreate(false)} className="px-4 py-2 border rounded-lg text-sm">ยกเลิก</button><button disabled={saving} onClick={createBox} className="px-5 py-2 bg-emerald-600 text-white rounded-lg text-sm font-semibold">{saving ? 'กำลังบันทึก...' : 'สร้างกล่อง + QR'}</button></div></div></div>}
    </div>
  );
}
