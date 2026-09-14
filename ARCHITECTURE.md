# 📐 S&B Enterprise ERP System Architecture

## Overview
S&B Enterprise ERP is an inventory management, financial document, and corporate operations ERP system built with Next.js 14 (App Router) and Prisma ORM, deployed on Google Cloud Run.

## System Layers
1. **Presentation Layer:** Next.js React App Router UI components (`app/`, `components/`).
2. **API & Route Handlers:** RESTful API route endpoints (`app/api/`) with server-side authorization.
3. **ERP Authoritative Query Layer:** Centralized deterministic database access functions (`lib/erp-queries.ts`).
4. **AI & Governance Layer:** Dual-model LLM engine (DeepSeek V3 primary, Remote Ollama fallback) governed by FIRE KEEPER (`lib/firekeeper-adapter.ts`).
5. **Data Persistence Layer:** Prisma ORM supporting PostgreSQL in production and SQLite for local development.

## Action & Approval Boundary
For business-critical operations (such as Purchase Order generation):
`READ -> ANALYZE -> DRAFT -> APPROVE (Human Boundary) -> EXECUTE`
AI agents generate drafts with `status: PENDING_HUMAN_APPROVAL`. Privileged human users must approve before database execution.
