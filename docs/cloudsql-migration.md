# Migration plan: SQLite → Google Cloud SQL/Postgres

1. Provision a Cloud SQL Postgres instance in Google Cloud Console.
2. Update your .env.example and .env files:
   - Remove/ignore SQLite config
   - Add:
     POSTGRES_HOST=your-cloudsql-host
     POSTGRES_PORT=5432
     POSTGRES_USER=your-username
     POSTGRES_PASSWORD=your-password
     POSTGRES_DB=your-db-name
3. Update database connection logic in your backend (API, MCP, etc.) to use Postgres via a Node.js ORM (e.g., Prisma, Knex, TypeORM).
4. Add a migration tool (e.g., Prisma, Knex) for schema management.
5. Test locally with a Postgres Docker container before deploying.
6. Update Dockerfile to install Postgres client libraries if needed.
7. Deploy and verify connection to Cloud SQL from Cloud Run (use Cloud SQL Auth Proxy if required).
8. Remove SQLite files and references from production code.

# Example: Prisma setup
- Install: npm install prisma @prisma/client
- Init: npx prisma init
- Update schema.prisma for Postgres
- Run: npx prisma migrate deploy

# Example: Knex setup
- Install: npm install knex pg
- Configure knexfile.js for Postgres
- Run: npx knex migrate:latest

# Cloud SQL Auth Proxy
- Docs: https://cloud.google.com/sql/docs/postgres/connect-run
- Add proxy as a sidecar or use built-in Cloud Run connection

# Test & verify
- Run tests against Postgres
- Confirm Cloud Run can connect to Cloud SQL
