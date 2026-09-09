import { z } from 'zod';

const EvidenceSchema = z.object({
  id: z.string(),
  text: z.string(),
  sourceId: z.string(),
});

const DecisionObjectSchema = z.object({
  options: z.array(z.object({ id: z.string(), text: z.string(), rationale: z.string(), isRecommended: z.boolean() })),
  risks: z.array(z.object({ id: z.string(), text: z.string(), severity: z.enum(['LOW','MEDIUM','HIGH','CRITICAL']), relatedOptionIds: z.array(z.string()).optional() })),
  uncertainties: z.array(z.object({ id: z.string(), text: z.string(), importance: z.enum(['LOW','MEDIUM','HIGH']) })),
  consequences: z.array(z.object({ id: z.string(), text: z.string(), timeframe: z.string().optional() })),
  evidence: z.array(EvidenceSchema),
  assumptions: z.array(z.string()),
  recommendation: z.object({ optionId: z.string(), rationale: z.string() }).optional(),
  confidence: z.object({ score: z.number(), label: z.enum(['LOW','MEDIUM','HIGH']), breakdown: z.record(z.string(), z.number()) }),
  applicable_policies: z.array(z.object({ id: z.string(), name: z.string() })),
  policy_conflicts: z.array(z.object({ policyId1: z.string(), policyId2: z.string(), severity: z.enum(['LOW','MEDIUM','HIGH','CRITICAL']), rationale: z.string() })),
  escalation_required: z.boolean(),
  controlLevel: z.enum(['LOW','MEDIUM','HIGH','CRITICAL']),
});

export type InventoryEvidence = {
  id: string;
  text: string;
  sourceId: string;
};

export type GovernedInventoryDecision = {
  decision: z.infer<typeof DecisionObjectSchema>;
  validation: {
    status: 'PASS' | 'REPAIR_REQUIRED' | 'ESCALATE';
    errors: string[];
  };
  evidence: InventoryEvidence[];
};

function confidenceFromEvidence(evidence: InventoryEvidence[]) {
  if (!evidence.length) return { score: 0, label: 'LOW' as const, breakdown: { coverage: 0, reliability: 0, quality: 0 } };
  const coverage = Math.min(1, evidence.length / 3);
  return { score: Number((coverage * 0.4 + 0.4 + 0.2).toFixed(3)), label: coverage >= 0.67 ? 'HIGH' as const : coverage >= 0.34 ? 'MEDIUM' as const : 'LOW' as const, breakdown: { coverage, reliability: 1, quality: 1 } };
}

/**
 * FIRE KEEPER-compatible governance boundary for inventory questions.
 * The ERP supplies evidence; this adapter creates and validates a Structured Decision Object.
 * It does not claim that the ERP has imported the private FIRE KEEPER repository runtime.
 */
export function governInventoryQuery(input: {
  question: string;
  evidence: InventoryEvidence[];
  answer: string;
  recommendation?: string;
  risk?: { text: string; severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' };
}): GovernedInventoryDecision {
  const confidence = confidenceFromEvidence(input.evidence);
  const options = [
    { id: 'ANSWER', text: input.answer, rationale: 'Generated from inventory evidence supplied by the ERP.', isRecommended: true },
  ];
  const decision = {
    options,
    risks: input.risk ? [{ id: 'R1', text: input.risk.text, severity: input.risk.severity }] : [],
    uncertainties: input.evidence.length ? [] : [{ id: 'U1', text: 'No inventory evidence was available.', importance: 'HIGH' as const }],
    consequences: [],
    evidence: input.evidence,
    assumptions: [],
    recommendation: input.recommendation ? { optionId: 'ANSWER', rationale: input.recommendation } : undefined,
    confidence,
    applicable_policies: [],
    policy_conflicts: [],
    escalation_required: input.risk?.severity === 'CRITICAL',
    controlLevel: input.risk?.severity === 'CRITICAL' ? 'CRITICAL' as const : input.risk?.severity === 'HIGH' ? 'HIGH' as const : 'LOW' as const,
  };

  const parsed = DecisionObjectSchema.safeParse(decision);
  if (!parsed.success) {
    return {
      decision: decision as z.infer<typeof DecisionObjectSchema>,
      validation: { status: 'REPAIR_REQUIRED', errors: parsed.error.issues.map(i => `${i.path.join('.')}: ${i.message}`) },
      evidence: input.evidence,
    };
  }

  const errors: string[] = [];
  if (parsed.data.recommendation && !parsed.data.options.some(o => o.id === parsed.data.recommendation?.optionId)) {
    errors.push('Recommendation refers to non-existent option');
  }
  if (parsed.data.policy_conflicts.some(c => c.severity === 'CRITICAL')) {
    return { decision: parsed.data, validation: { status: 'ESCALATE', errors: ['Critical policy conflict detected'] }, evidence: input.evidence };
  }
  return { decision: parsed.data, validation: { status: errors.length ? 'REPAIR_REQUIRED' : 'PASS', errors }, evidence: input.evidence };
}
