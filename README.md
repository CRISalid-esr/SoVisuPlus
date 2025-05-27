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
