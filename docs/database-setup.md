# Database Setup Guide

This guide explains how to set up PostgreSQL locally for Daily Baker development.

## Prerequisites

- PostgreSQL 14+ installed locally
- pgAdmin or another PostgreSQL client (optional)

## Installation

### macOS (using Homebrew)

```bash
# Install PostgreSQL
brew install postgresql@16

# Start PostgreSQL service
brew services start postgresql@16

# Verify installation
psql --version
```

### Ubuntu/Debian

```bash
# Install PostgreSQL
sudo apt update
sudo apt install postgresql postgresql-contrib

# Start PostgreSQL service
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Verify installation
psql --version
```

### Windows

1. Download PostgreSQL installer from https://www.postgresql.org/download/windows/
2. Run the installer and follow the setup wizard
3. Remember the password you set for the `postgres` user

## Database Creation

### 1. Access PostgreSQL

```bash
# macOS/Linux (default user is usually your system username)
psql postgres

# Or with explicit user
psql -U postgres
```

### 2. Create Database and User

```sql
-- Create the database
CREATE DATABASE daily_baker;

-- Create a dedicated user (recommended for development)
CREATE USER daily_baker_user WITH PASSWORD 'your_secure_password';

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE daily_baker TO daily_baker_user;

-- Connect to the database
\c daily_baker

-- Grant schema privileges
GRANT ALL ON SCHEMA public TO daily_baker_user;

-- Exit psql
\q
```

## Environment Configuration

### 1. Update .env File

Copy `.env.example` to `.env` and update the DATABASE_URL values:

```bash
cp .env.example .env
```

Update these values in `.env`:

```env
# For local development without connection pooling
DATABASE_URL="postgresql://daily_baker_user:your_secure_password@localhost:5432/daily_baker"
DIRECT_DATABASE_URL="postgresql://daily_baker_user:your_secure_password@localhost:5432/daily_baker"
```

### 2. For Production (with Connection Pooling)

When deploying to production, use connection pooling for better performance:

```env
# With PgBouncer or similar pooler
DATABASE_URL="postgresql://user:password@pooler-host:6543/daily_baker?pgbouncer=true"
DIRECT_DATABASE_URL="postgresql://user:password@direct-host:5432/daily_baker"
```

## Connection Pooling Setup (Optional for Local Development)

### Using PgBouncer

```bash
# Install PgBouncer
brew install pgbouncer  # macOS
# or
sudo apt install pgbouncer  # Ubuntu/Debian

# Configure PgBouncer (example configuration)
# Edit /etc/pgbouncer/pgbouncer.ini or ~/.pgbouncer/pgbouncer.ini
```

Example `pgbouncer.ini`:

```ini
[databases]
daily_baker = host=localhost port=5432 dbname=daily_baker

[pgbouncer]
listen_port = 6543
listen_addr = 127.0.0.1
auth_type = md5
auth_file = /etc/pgbouncer/userlist.txt
pool_mode = transaction
max_client_conn = 100
default_pool_size = 20
```

## Prisma Setup

### 1. Generate Prisma Client

```bash
npm run db:generate
```

### 2. Run Initial Migration

After defining your schema models (see Issue #4), run:

```bash
npm run db:migrate
```

This will:
- Create migration files in `prisma/migrations/`
- Apply migrations to your database
- Update the Prisma Client

### 3. Seed Database (Optional)

Once seed data is implemented (Issue #10):

```bash
npm run db:seed
```

## Useful Commands

```bash
# Generate Prisma Client
npm run db:generate

# Create and apply a new migration
npm run db:migrate

# Reset database (WARNING: deletes all data)
npm run db:migrate:reset

# Seed the database
npm run db:seed

# Open Prisma Studio (GUI for browsing data)
npm run db:studio
```

## Troubleshooting

### Connection Refused

If you get "connection refused" errors:

```bash
# Check if PostgreSQL is running
brew services list  # macOS
# or
sudo systemctl status postgresql  # Linux

# Start PostgreSQL if needed
brew services start postgresql@16  # macOS
# or
sudo systemctl start postgresql  # Linux
```

### Authentication Failed

If you get authentication errors:

1. Verify your username and password in `.env`
2. Check PostgreSQL's `pg_hba.conf` for authentication settings
3. Ensure the user has proper privileges

```sql
-- Verify user exists
\du

-- Grant privileges again if needed
GRANT ALL PRIVILEGES ON DATABASE daily_baker TO daily_baker_user;
```

### Permission Denied for Schema

```sql
-- Connect to the database first
\c daily_baker

-- Grant schema privileges
GRANT ALL ON SCHEMA public TO daily_baker_user;
GRANT ALL ON ALL TABLES IN SCHEMA public TO daily_baker_user;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO daily_baker_user;
```

## Production Recommendations

1. **Use Connection Pooling**: Prisma's connection pooling or external poolers like PgBouncer
2. **Enable SSL**: Always use SSL in production
3. **Managed Database**: Consider managed PostgreSQL services:
   - Supabase (includes connection pooling)
   - Neon (serverless PostgreSQL)
   - AWS RDS
   - Vercel Postgres
4. **Backup Strategy**: Implement automated backups
5. **Monitoring**: Set up database performance monitoring

## Next Steps

1. ✅ PostgreSQL installed and running
2. ✅ Database created
3. ✅ Environment variables configured
4. ⏳ Define database schema (Issue #4)
5. ⏳ Run migrations
6. ⏳ Seed initial data

For schema definition, see the next issue (#4: Define Multi-Tenant Database Schema).
