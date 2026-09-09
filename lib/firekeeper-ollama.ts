import { DecisionObjectSchema, type DecisionObject } from './firekeeper-contract';

export type GovernedOllamaResult = {
  decision: DecisionObject | null;
  raw: string;
  errors: string[];
};

function extractJson(text: string): unknown {
  const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  try { return JSON.parse(cleaned); } catch {}
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start >= 0 && end > start) {
    try { return JSON.parse(cleaned.slice(start, end + 1)); } catch {}
  }
  return null;
}

export async function askOllamaForDecision(input: {
  baseUrl: string;
  model: string;
  question: string;
  evidence: { id: string; text: string; sourceId: string }[];
  system?: string;
}): Promise<GovernedOllamaResult> {
  const evidenceText = input.evidence.map(e => `[${e.id}] source=${e.sourceId}\n${e.text}`).join('\n\n');
  const prompt = `${input.system || 'คุณเป็น AI ภายใต้ FIRE KEEPER Governance'}\n\nสร้าง JSON เท่านั้นตาม schema ที่กำหนด\nห้ามสร้าง evidence ใหม่ และ evidence ทุกตัวต้องใช้ id/sourceId จากหลักฐานที่ให้มาเท่านั้น\nห้ามอ้างข้อมูลที่ไม่มีในหลักฐาน\nหากข้อมูลไม่พอ ให้ใส่ uncertainty และลด confidence\n\nคำถาม:\n${input.question}\n\nหลักฐาน:\n${evidenceText}\n\nคืนค่าเป็น DecisionObject JSON เท่านั้น`;

  const response = await fetch(`${input.baseUrl.replace(/\/$/, '')}/api/generate`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: input.model, stream: false, format: 'json', prompt }),
  });
  if (!response.ok) throw new Error(`Ollama HTTP ${response.status}`);
  const data = await response.json();
  const raw = String(data.response || '');
  const candidate = extractJson(raw);
  const parsed = DecisionObjectSchema.safeParse(candidate);
  if (!parsed.success) return { decision: null, raw, errors: parsed.error.issues.map(i => `${i.path.join('.')}: ${i.message}`) };

  const supplied = new Map(input.evidence.map(e => [e.id, e.sourceId]));
  const evidenceErrors = parsed.data.evidence.filter(e => supplied.get(e.id) !== e.sourceId || !supplied.has(e.id));
  if (evidenceErrors.length) return { decision: null, raw, errors: ['LLM introduced evidence that is not traceable to ERP evidence'] };
  return { decision: parsed.data, raw, errors: [] };
}
