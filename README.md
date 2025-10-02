# SoVisu+

A Comprehensive App for Managing Scientific Output and Researcher Identifiers

SoVisu+ is distributed under the terms of
the [CeCILL v2.1 license](http://www.cecill.info/licences/Licence_CeCILL_V2.1-fr.txt) (GPL compatible).

:warning: This project is still in development and is not yet ready for production.

## Installation

### Manual Installation

1. Clone the repository
2. Install the dependencies with `npm install`. To include dev dependencies, use `npm install --dev`.<br />
   If you encounter issues while installing dependencies, It could be due to mismatched versions or compatibility
   problems between React, React DOM, and Material UI, You can use the command `npm install --legacy-peer-deps` to
   resolve the problem temporary. You can find below two links that describe the problem:<br>
   [mui/material-ui#44203](https://github.com/mui/material-ui/issues/44203)<br>
   [mui/material-ui#42428](https://github.com/mui/material-ui/pull/42428)

3. Install Postgresql and create a database.
   Prisma initial migration requires the CREATE DATABASE privilege.

```sql
CREATE USER sovisuplus WITH PASSWORD '**************';
ALTER USER sovisuplus CREATEDB;
[DROP DATABASE sovisuplus;]
CREATE DATABASE sovisuplus;
GRANT ALL PRIVILEGES ON DATABASE sovisuplus to sovisuplus;
```

In case you are using PostgreSQL v15 the `CREATE` privilege do not grant to everyone on the public schema by default. To
resolve this problem you need to change the database owner using the following command

```sql
ALTER DATABASE sovisuplus OWNER TO sovisuplus ;
```

4. Run Keycloak with Docker

```bash
docker run -e KEYCLOAK_ADMIN=admin -e KEYCLOAK_ADMIN_PASSWORD=admin -p 8080:8080 quay.io/keycloak/keycloak:22.0.0 start-dev
```

Or with the provided docker-compose file.

```bash
cd keycloak
cp .env.sample .env
# Edit the .env file with your own configuration
docker-compose up -d
```

The first method will force you to do the configuration manually for each launch, while the second method will
preserve your configuration.

Access Keycloak at `http://localhost:8080` and create :

- a realm named from the organisation using SoVisu+ (e.g. `myuniversity`)
- a sovisuplus client of type `openid-connect` with the following settings:
  - Client ID: `sovisuplus`
  - Valid Redirect URIs: `http://localhost:3000/*`
  - Valid post logout redirect URIs: `http://localhost:3000/api/auth/signout`
  - Web Origins: `http://localhost:3000`
  - Client authentication: `On`
- Add a credential to the client with the following settings:
  - Client Authenticator : `Client Id and Secret`
  - Client Secret: `credential_generated_by_keycloak_here`

5. Create a `.env` file in the root directory of the project and fill it with the following content:

```env
DATABASE_URL="postgresql://sovisuplus:**************@localhost:5432/sovisuplus"

KEYCLOAK_CLIENT_ID="sovisuplus"
KEYCLOAK_CLIENT_SECRET="credential_generated_by_keycloak_here"
KEYCLOAK_ISSUER="http://localhost:8080/realms/my-keycloak-realm-here" # e.g. myuniversity
KEYCLOAK_PUBLIC_URL="http://localhost:8080/realms/my-keycloak-realm-here"

NEXTAUTH_URL="http://localhost:3000/api/auth"
NEXTAUTH_SECRET="[generate a secret with : openssl rand -base64 32]"
```

6. Run the Prisma migration with `npx prisma migrate dev --name init`.
7. Run the development server with `npm run dev`.

To enable the AMQP listener, start a Rabbitmq instance on your local machine, fill in the .env file
with Rabbitmq parameters and run the listener : `npm run dev:listener`

### Tests

#### Unit tests

The following command will run the unit tests:

```bash
npm run test
```

#### End-to-end tests

The following command will run the integration tests:

```bash
npm run test:integration
```

It requires a separate PostgreSQL database to run the tests. You can use the following command to start a PostgreSQL
instance with Docker:

```bash
docker run -it  --rm --name postgres_test_service   -e POSTGRES_USER=sovisuplus_test   -e POSTGRES_PASSWORD=sovisuplus_test   -e POSTGRES_DB=sovisuplus_test   -p 5433:5432  postgres:latest
```

### Docker Installation

#### For staging environment

[//]: # 'TODO update the docker procedure and Dockerfile with Keycloack integration'

1. Build the Docker image with `docker build -t sovisuplus:v0.1 -f ./docker/staging/Dockerfile .`
2. Run the Docker container with `docker compose -f ./docker/staging/docker-compose.yml up -d`.
3. The application is now available at `http://localhost:3002`.

### I18n

## 🌐 Internationalization (i18n)

**SoVisu+** uses [LinguiJS](https://lingui.js.org/) to manage translations in a clean, developer-friendly way.

### 🛠 Extract translatable messages

During development, run this to extract all messages from your code:

```bash
npm run i18n:extract
```

This will update the `.po` translation files under `src/locales/`.

### 🎯 Compile translations

After translations are updated (manually or via a tool like [Poeditor](https://poeditor.com/)), compile them for use in
the app:

```bash
npm run i18n:compile
```

This generates optimized JS catalogs from the `.po` files for runtime use.

---

## 🧹 Bonus: Detect duplicate Lingui translations

When working with `.po` files, it's common to end up with both:

- An **obsolete translation** (commented out with `#~`)
- A new active translation for the **same key**

To help identify those cases, you can use the script below.

### 📜 Python script: `detect-lingui-duplicates.py`

```bash
python3 detect-lingui-duplicates.py src/locales/fr/messages.po
```

### ✅ What it does:

- Scans the `.po` file
- Finds message IDs that appear **both**:

  - As a commented-out (obsolete) entry with a translation
  - As an active entry with a translation (possibly empty)

- Prints a report showing duplicated translations

### 💡 Why it matters:

This helps you:

- Detect inconsistencies
- Avoid losing older translations when running extraction with the `--clean`
  flag (what the npm script does by default)

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
