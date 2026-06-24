# AWS Lab Project

## Day 1 — EC2 + IAM + S3
- Launched EC2, deployed Node/Express API with PM2
- Created IAM user with access keys
- S3 bucket for file uploads — upload, presigned URL, delete

## Day 2 — Database (PostgreSQL)
- PostgreSQL 
- Prisma ORM
- User register, login, JWT auth

## Day 3 — Caching (Redis / ElastiCache)
- Redis cluster on ElastiCache (TLS enabled)
- Token blacklisting on logout
- Login rate limiting — max 10 attempts per minute per IP

## Day 4 — Queue (SQS)
- Standard queue on SQS
- On register → push message to SQS
- Worker polls queue and processes welcome email messages