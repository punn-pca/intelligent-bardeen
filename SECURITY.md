# 🛡️ Security & Role-Based Access Control (RBAC)

## Roles & Scoping
- **ADMIN:** Full system administration, product edits, company settings, approvals, user management.
- **MANAGER:** Inventory management, document creation, document approval, stock adjustments.
- **WAREHOUSE:** Stock receive, stock issue, transfers, physical inventory counts.
- **ACCOUNTING:** Customers, suppliers, document processing, financial reporting.
- **USER:** Read-only product and inventory queries.

## Server-Side Enforcement
All permission checks (`canReadCost`, `canReadFinance`, `canCreatePoDraft`, `hasPermission`) are enforced on the server-side API handlers. Client-side role selection is for UI presentation only.

## Secrets Management
- API Keys (`DEEPSEEK_API_KEY`, `GEMINI_API_KEY`) are stored strictly in server-side environment variables and are never transmitted to the client.
