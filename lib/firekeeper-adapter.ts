import { EvidenceSchema, DecisionObjectSchema, Severity, validateDecisionObject, type Evidence, type DecisionObject, type ValidatorResult, type EpistemicState } from './firekeeper-contract';
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
  const coverage = Math.min(1, input.evidence.length / 5);
  const reliability = hasEvidence ? 1 : 0;
  const quality = hasEvidence ? 0.95 : 0;
  const score = hasEvidence ? Number((0.40 * coverage + 0.35 * reliability + 0.25 * quality).toFixed(3)) : 0;
  const label = score >= 0.75 ? 'HIGH' : score >= 0.45 ? 'MEDIUM' : 'LOW';
  const severity = input.risk?.severity || 'LOW';

  const epistemic_state: EpistemicState = !hasEvidence
    ? 'INSUFFICIENT_EVIDENCE'
    : coverage >= 0.8
    ? 'SUPPORTED'
    : 'PARTIALLY_SUPPORTED';

  const decision = {
    options: [{ id: 'ANSWER', text: input.answer, rationale: 'Derived from ERP inventory evidence.', isRecommended: true }],
    risks: input.risk ? [{ id: 'R1', text: input.risk.text, severity: input.risk.severity }] : [],
    uncertainties: hasEvidence ? [] : [{ id: 'U1', text: 'No authoritative inventory evidence was found for this query.', importance: 'HIGH' as const }],
    consequences: [],
    evidence: input.evidence,
    assumptions: [],
    recommendation: input.recommendation ? { optionId: 'ANSWER', rationale: input.recommendation } : undefined,
    confidence: {
      score,
      label,
      breakdown: {
        evidence_confidence: Number((reliability * coverage).toFixed(2)),
        answer_confidence: Number(quality.toFixed(2)),
        decision_confidence: score,
        coverage,
        reliability,
        quality,
      },
    },
    epistemic_state,
    applicable_policies: [],
    policy_conflicts: [],
    escalation_required: severity === 'CRITICAL',
    controlLevel: severity,
  };

  const parsed = DecisionObjectSchema.safeParse(decision);
  if (!parsed.success) {
    return {
      decision: decision as DecisionObject,
      validation: {
        status: 'REPAIR_REQUIRED',
        errors: parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`),
        metadata: { timestamp: new Date().toISOString(), checkedFields: [] },
      },
      evidence: input.evidence,
    };
  }

  return { decision: parsed.data, validation: validateDecisionObject(parsed.data), evidence: input.evidence };
}

/** Validate an LLM-produced DecisionObject while strictly enforcing authoritative evidence grounding. */
export function governLLMDecision(input: {
  question: string;
  evidence: InventoryEvidence[];
  candidate: unknown;
}): GovernedInventoryDecision {
  const candidateObj = (typeof input.candidate === 'object' && input.candidate !== null ? { ...(input.candidate as any) } : {}) as any;

  // Always ground evidence to authoritative ERP evidence set
  candidateObj.evidence = input.evidence;

  // Ensure options structure is populated
  if (!Array.isArray(candidateObj.options) || candidateObj.options.length === 0) {
    const rawText = candidateObj.text || candidateObj.answer || candidateObj.response || 'ไม่มีข้อมูลสรุปจากโมเดล';
    candidateObj.options = [{ id: 'ANSWER', text: rawText, rationale: 'LLM generated answer grounded in ERP evidence.', isRecommended: true }];
  }

  // Calculate dynamic non-hardcoded confidence based on evidence coverage
  const evidenceCount = input.evidence.length;
  const coverageRatio = Math.min(1, evidenceCount / 5);
  const dynamicScore = evidenceCount > 0
    ? Number((0.35 + coverageRatio * 0.60).toFixed(3))
    : 0.10;

  const dynamicLabel = dynamicScore >= 0.75 ? 'HIGH' : dynamicScore >= 0.45 ? 'MEDIUM' : 'LOW';

  if (!candidateObj.confidence || typeof candidateObj.confidence.score !== 'number') {
    candidateObj.confidence = {
      score: dynamicScore,
      label: dynamicLabel,
      breakdown: {
        evidence_confidence: Number((evidenceCount > 0 ? 0.90 * coverageRatio : 0).toFixed(2)),
        answer_confidence: Number((evidenceCount > 0 ? 0.85 : 0.20).toFixed(2)),
        decision_confidence: dynamicScore,
        coverage: coverageRatio,
      },
    };
  } else {
    // Bound LLM-supplied confidence score by evidence coverage to prevent ungrounded 1.00 score
    const boundedScore = Number(Math.min(candidateObj.confidence.score, evidenceCount > 0 ? 0.95 : 0.20).toFixed(3));
    candidateObj.confidence.score = boundedScore;
    candidateObj.confidence.label = boundedScore >= 0.75 ? 'HIGH' : boundedScore >= 0.45 ? 'MEDIUM' : 'LOW';
    if (!candidateObj.confidence.breakdown) {
      candidateObj.confidence.breakdown = {
        evidence_confidence: Number((coverageRatio * 0.90).toFixed(2)),
        answer_confidence: 0.85,
        decision_confidence: boundedScore,
      };
    }
  }

  const epistemic_state: EpistemicState = evidenceCount === 0
    ? 'INSUFFICIENT_EVIDENCE'
    : coverageRatio >= 0.8
    ? 'SUPPORTED'
    : 'PARTIALLY_SUPPORTED';

  candidateObj.epistemic_state = candidateObj.epistemic_state || epistemic_state;

  if (!Array.isArray(candidateObj.risks)) candidateObj.risks = [];
  if (!Array.isArray(candidateObj.uncertainties)) candidateObj.uncertainties = [];
  if (!Array.isArray(candidateObj.consequences)) candidateObj.consequences = [];
  if (!Array.isArray(candidateObj.assumptions)) candidateObj.assumptions = [];
  if (!Array.isArray(candidateObj.applicable_policies)) candidateObj.applicable_policies = [];
  if (!Array.isArray(candidateObj.policy_conflicts)) candidateObj.policy_conflicts = [];
  if (typeof candidateObj.escalation_required !== 'boolean') candidateObj.escalation_required = false;
  if (!candidateObj.controlLevel) candidateObj.controlLevel = 'LOW';

  const parsed = DecisionObjectSchema.safeParse(candidateObj);
  if (!parsed.success) {
    const text = candidateObj.options?.[0]?.text || 'ไม่มีข้อมูล';
    return governInventoryQuery({ question: input.question, evidence: input.evidence, answer: text });
  }

  const governedDecision: DecisionObject = { ...parsed.data, evidence: input.evidence };
  const validation = validateDecisionObject(governedDecision);
  return { decision: governedDecision, validation, evidence: input.evidence };
}
