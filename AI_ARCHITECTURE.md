# 🧠 FIRE KEEPER AI Architecture & Governance

## Pipeline Flow
```text
User Question
    ↓
Intent & Action Classification
    ↓
Server-Side Permission Check (RBAC)
    ↓
Authoritative ERP Database Query (lib/erp-queries.ts)
    ↓
Evidence Construction (Authoritative ERP Context)
    ↓
LLM Processing (Primary: DeepSeek V3 -> Secondary: Gemini -> Tertiary: Ollama)
    ↓
FIRE KEEPER Governance Adapter (lib/firekeeper-adapter.ts)
    ↓
Dynamic Confidence & Epistemic State Classification
    ↓
Cryptographic AI Audit Log Recording (lib/audit-logger.ts)
    ↓
Validated Response / PO Draft Payload
```

## Epistemic States
- **SUPPORTED:** High evidence coverage (>= 80%) with direct ERP data grounding.
- **PARTIALLY_SUPPORTED:** Moderate evidence coverage (< 80%).
- **INSUFFICIENT_EVIDENCE:** No authoritative ERP evidence found.
- **CONFLICTING_EVIDENCE:** Policy or data discrepancy detected.
- **OUT_OF_SCOPE:** Query outside ERP system scope.

## Rules & Boundaries
1. **LLM is never the Source of Truth:** Numbers, stock counts, document totals, and company profile attributes come strictly from database queries.
2. **Ungrounded Confidence Bounding:** Confidence scores are computed dynamically from evidence coverage and bounded to <= 0.95 for LLMs.
3. **Fail-Closed Governance:** If validation fails, LLM output is not promoted as trusted evidence.
