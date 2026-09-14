# 🗄️ Database Architecture & Migration Guide

## Datasource Configuration
Prisma schema (`prisma/schema.prisma`) uses `url = env("DATABASE_URL")`.

## Environment Setup
- **Local Development / Testing:**
  `DATABASE_URL="file:./dev.db"`
- **Production (Google Cloud Run / Cloud SQL):**
  `DATABASE_URL="postgresql://user:password@host:5432/dbname?schema=public"`

## Production Migration Strategy
1. Provision a PostgreSQL instance (e.g. Google Cloud SQL for PostgreSQL).
2. Set `DATABASE_URL` in Cloud Run Environment Variables.
3. Run `npx prisma db push` or `npx prisma migrate deploy` during deployment pipeline.
