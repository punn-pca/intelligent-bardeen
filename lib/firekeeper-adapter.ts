import { z } from 'zod';

const Severity = z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']);
const EvidenceSchema = z.object({
  id: z.string(),
  text: z.string(),
  sourceId: z.string(),
});

const DecisionObjectSchema = z.object({
  options: z.array(z.object({ id: z.string(), text: z.string(), rationale: z.string(), isRecommended: z.boolean() })),
  risks: z.array(z.object({ id: z.string(), text: z.string(), severity: Severity, relatedOptionIds: z.array(z.string()).optional() })),
  uncertainties: z.array(z.object({ id: z.string(), text: z.string(), importance: z.enum(['LOW', 'MEDIUM', 'HIGH']) })),
  consequences: z.array(z.object({ id: z.string(), text: z.string(), timeframe: z.string().optional() })),
  evidence: z.array(EvidenceSchema),
  assumptions: z.array(z.string()),
  recommendation: z.object({ optionId: z.string(), rationale: z.string() }).optional(),
  confidence: z.object({ score: z.number(), label: z.enum(['LOW', 'MEDIUM', 'HIGH']), breakdown: z.record(z.string(), z.number()) }),
  applicable_policies: z.array(z.object({ id: z.string(), name: z.string() })),
  policy_conflicts: z.array(z.object({ policyId1: z.string(), policyId2: z.string(), severity: Severity, rationale: z.string() })),
  escalation_required: z.boolean(),
  controlLevel: Severity,
});

export type InventoryEvidence = z.infer<typeof EvidenceSchema>;
export type GovernedInventoryDecision = {
  decision: z.infer<typeof DecisionObjectSchema>;
  validation: { status: 'PASS' | 'REPAIR_REQUIRED' | 'ESCALATE'; errors: string[] };
  evidence: InventoryEvidence[];
};

export function governInventoryQuery(input: {
  question: string;
  evidence: InventoryEvidence[];
  answer: string;
  recommendation?: string;
  risk?: { text: string; severity: z.infer<typeof Severity> };
}): GovernedInventoryDecision {
  const coverage = input.evidence.length === 0 ? 0 : Math.min(1, input.evidence.length / 3);
  const reliability = input.evidence.length === 0 ? 0 : 1;
  const quality = input.evidence.length === 0 ? 0 : 1;
  const score = Number((0.40 * coverage + 0.35 * reliability + 0.25 * quality).toFixed(3));
  const confidenceLabel = score >= 0.75 ? 'HIGH' as const : score >= 0.45 ? 'MEDIUM' as const : 'LOW' as const;
  const critical = input.risk?.severity === 'CRITICAL';
  const high = input.risk?.severity === 'HIGH';

  const decision = {
    options: [{ id: 'ANSWER', text: input.answer, rationale: 'Derived from ERP inventory evidence.', isRecommended: true }],
    risks: input.risk ? [{ id: 'R1', text: input.risk.text, severity: input.risk.severity }] : [],
    uncertainties: input.evidence.length ? [] : [{ id: 'U1', text: 'No authoritative inventory evidence was found for this query.', importance: 'HIGH' as const }],
    consequences: [],
    evidence: input.evidence,
    assumptions: [],
    recommendation: input.recommendation ? { optionId: 'ANSWER', rationale: input.recommendation } : undefined,
    confidence: { score, label: confidenceLabel, breakdown: { coverage, reliability, quality } },
    applicable_policies: [],
    policy_conflicts: [],
    escalation_required: critical,
    controlLevel: critical ? 'CRITICAL' as const : high ? 'HIGH' as const : (input.risk?.severity || 'LOW'),
  };

  const parsed = DecisionObjectSchema.safeParse(decision);
  if (!parsed.success) {
    return { decision: decision as z.infer<typeof DecisionObjectSchema>, validation: { status: 'REPAIR_REQUIRED', errors: parsed.error.issues.map(i => `${i.path.join('.')}: ${i.message}`) }, evidence: input.evidence };
  }
  if (parsed.data.escalation_required) {
    return { decision: parsed.data, validation: { status: 'ESCALATE', errors: ['Inventory decision requires human review.'] }, evidence: input.evidence };
  }
  return { decision: parsed.data, validation: { status: 'PASS', errors: [] }, evidence: input.evidence };
}
