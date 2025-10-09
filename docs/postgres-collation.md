## How to solve PostgreSQL collation version Issue

### Symptoms

- Inconsistent alphabetical sorting
- Errors during Prisma migrate such as:

```
Error: P3014
Original error:
ERROR: template database "template1" has a collation version mismatch
DETAIL: The template database was created using collation version 2.36, but the operating system provides version 2.41.
```

---

## Solution

### 1. Application database (`sovisuplus`)

```sql
-- Connect as superuser to postgres, then:
\c sovisuplus

-- Rebuild all indexes with the new collation rules
REINDEX DATABASE sovisuplus;

-- Update the recorded collation version
ALTER DATABASE sovisuplus REFRESH COLLATION VERSION;
```

### 2. Template database (`template1`)

Prisma uses `template1` when creating new databases. It must also be refreshed.

```sql
-- Connect to postgres as superuser
\c postgres

-- Allow connecting and editing template1
ALTER DATABASE template1 IS_TEMPLATE false;
ALTER DATABASE template1 ALLOW_CONNECTIONS true;

-- Switch to template1
\c template1

-- Rebuild indexes and refresh collation version
REINDEX DATABASE template1;
ALTER DATABASE template1 REFRESH COLLATION VERSION;

-- Switch back to postgres
\c postgres

-- Restore template flags
ALTER DATABASE template1 ALLOW_CONNECTIONS false;
ALTER DATABASE template1 IS_TEMPLATE true;
```
