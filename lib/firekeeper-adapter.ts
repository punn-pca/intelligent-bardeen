import { EvidenceSchema, DecisionObjectSchema, Severity, validateDecisionObject, type Evidence, type DecisionObject, type ValidatorResult } from './firekeeper-contract';
import { z } from 'zod';

export const InventoryEvidenceSchema = EvidenceSchema;
export type InventoryEvidence = Evidence;
export type GovernedInventoryDecision = { decision: DecisionObject; validation: ValidatorResult; evidence: InventoryEvidence[] };

/** FIRE KEEPER boundary: ERP evidence is authoritative; LLM output is never promoted to evidence. */
export function governInventoryQuery(input: {
  question: string;
  evidence: InventoryEvidence[];
  answer: string;
  recommendation?: string;
  risk?: { text: string; severity: z.infer<typeof Severity> };
}): GovernedInventoryDecision {
  const hasEvidence = input.evidence.length > 0;
  const coverage = Math.min(1, input.evidence.length / 3);
  const reliability = hasEvidence ? 1 : 0;
  const quality = hasEvidence ? 1 : 0;
  // FIRE KEEPER contract requires a numeric confidence score. No evidence = 0.
  const score = hasEvidence ? Number((0.40 * coverage + 0.35 * reliability + 0.25 * quality).toFixed(3)) : 0;
  const label = score >= 0.75 ? 'HIGH' : score >= 0.45 ? 'MEDIUM' : 'LOW';
  const severity = input.risk?.severity || 'LOW';
  const decision = {
    options: [{ id: 'ANSWER', text: input.answer, rationale: 'Derived from ERP inventory evidence.', isRecommended: true }],
    risks: input.risk ? [{ id: 'R1', text: input.risk.text, severity: input.risk.severity }] : [],
    uncertainties: hasEvidence ? [] : [{ id: 'U1', text: 'No authoritative inventory evidence was found for this query.', importance: 'HIGH' as const }],
    consequences: [], evidence: input.evidence, assumptions: [],
    recommendation: input.recommendation ? { optionId: 'ANSWER', rationale: input.recommendation } : undefined,
    confidence: { score, label, breakdown: { coverage, reliability, quality } },
    applicable_policies: [], policy_conflicts: [],
    escalation_required: severity === 'CRITICAL', controlLevel: severity,
  };
  const parsed = DecisionObjectSchema.safeParse(decision);
  if (!parsed.success) return { decision: decision as DecisionObject, validation: { status: 'REPAIR_REQUIRED', errors: parsed.error.issues.map(i => `${i.path.join('.')}: ${i.message}`), metadata: { timestamp: new Date().toISOString(), checkedFields: [] } }, evidence: input.evidence };
  return { decision: parsed.data, validation: validateDecisionObject(parsed.data), evidence: input.evidence };
}

/** Validate an LLM-produced DecisionObject without trusting its evidence claims. */
export function governLLMDecision(input: {
  question: string;
  evidence: InventoryEvidence[];
  candidate: unknown;
}): GovernedInventoryDecision {
  const parsed = DecisionObjectSchema.safeParse(input.candidate);
  if (!parsed.success) {
    const fallback = governInventoryQuery({ question: input.question, evidence: input.evidence, answer: 'ไม่สามารถยืนยันคำตอบจากโมเดลได้ เนื่องจากรูปแบบ Decision Object ไม่ผ่านการตรวจสอบ' });
    return { ...fallback, validation: { status: 'REPAIR_REQUIRED', errors: parsed.error.issues.map(i => `${i.path.join('.')}: ${i.message}`), metadata: { timestamp: new Date().toISOString(), checkedFields: [] } } };
  }

  const candidate = parsed.data;
  const authoritative = new Map(input.evidence.map(e => [e.id, e]));
  const unsupportedEvidence = candidate.evidence.filter(e => {
    const source = authoritative.get(e.id);
    return !source || source.sourceId !== e.sourceId || source.text !== e.text;
  });
  if (unsupportedEvidence.length) {
    const validation: ValidatorResult = {
      status: 'REPAIR_REQUIRED',
      errors: unsupportedEvidence.map(e => `Unsupported evidence claim: ${e.id}`),
      metadata: { timestamp: new Date().toISOString(), checkedFields: ['evidence'] },
    };
    return { decision: { ...candidate, evidence: input.evidence }, validation, evidence: input.evidence };
  }

  const governedDecision: DecisionObject = { ...candidate, evidence: input.evidence };
  const validation = validateDecisionObject(governedDecision);
  return { decision: governedDecision, validation, evidence: input.evidence };
}
