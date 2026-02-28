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

5. Create a `.env` file in the root directory of the project and fill it with the same content as the `.env.sample` file.
   Adapt the values to your local configuration needs.

Following table gives detailed information on each environment variable:

| Name                          | Description                                                  | Secret? | Server / Client | Instance dependant | Dev / Prod                             | Transpilation time |
| ----------------------------- | ------------------------------------------------------------ | ------- | --------------- | ------------------ | -------------------------------------- | ------------------ |
| NEXT_PUBLIC_SUPPORTED_LOCALES | Application available languages                              | n       | server & client | n                  | prod                                   | y                  |
| NEXT_PUBLIC_BASE_URL          | Base URL for the application (e.g. http://localhost:3000)    | n       | client          | y                  | prod                                   | n                  |
| NEXT_PUBLIC_WS_SCHEME         | Web socket scheme for message listener                       | n       | client          | y (ws or wss)      | prod                                   | n                  |
| NEXT_PUBLIC_WS_HOST           | Web socket host for message listener                         | n       | client          | y                  | prod                                   | n                  |
| NEXT_PUBLIC_WS_PORT           | Web socket port for message listener (client side listening) | n       | client          | y                  | prod                                   | n                  |
| NEXT_PUBLIC_WS_PATH           | Web socket path for message listener                         | n       | client          | y                  | prod                                   | n                  |
| DATABASE_URL                  | Sovisuplus database url                                      | y       | server          | y                  | prod                                   | n                  |
| DATABASE_URL_TEST             | Sovisuplus test database url                                 | n       | server          | y                  | dev                                    | n                  |
| NEXT_PUBLIC_ORCID_URL         | Orcid connexion url                                          | n       | server & client | y                  | prod (orcid.org) / dev (sandbox.orcid) | n                  |
| NEXT_PUBLIC_ORCID_SCOPES      | Orcid scopes authorizations                                  | n       | server & client | y                  | prod                                   | n                  |
| NEXT_PUBLIC_ORCID_CLIENT_ID   | Orcid client institution id                                  | n       | server & client | y                  | prod                                   | n                  |
| ORCID_CLIENT_SECRET           | Orcid institution client secret pwd                          | y       | server          | y                  | prod                                   | n                  |
| KEYCLOAK_CLIENT_ID            | Keycloak client institution identifier                       | n       | server          | y                  | prod                                   | n                  |
| KEYCLOAK_CLIENT_SECRET        | Keycloak institution client secret pwd                       | y       | server          | y                  | prod                                   | n                  |
| KEYCLOAK_ISSUER               | Keycloak institution issuer url                              | y       | server          | y                  | prod                                   | n                  |
| KEYCLOAK_PUBLIC_URL           | Keycloak institution base url                                | n       | server          | y                  | prod                                   | n                  |
| NEXTAUTH_SECRET               | Sovisuplus secret for authentication                         | y       | server          | y                  | prod                                   | n                  |
| JWT_TOKEN_EXPIRATION_HOURS    | Expiration time for JWT tokens (in hours)                    | n       | server          | y                  | prod                                   | n                  |
| AMQP_USER                     | App user name for connecting to AMQP                         | y       | server          | y                  | prod                                   | n                  |
| AMQP_PASSWORD                 | App password for connecting to AMQP bus                      | y       | server          | y                  | prod                                   | n                  |
| AMQP_HOST                     | AMQP bus host                                                | y       | server          | y                  | prod                                   | n                  |
| AMQP_PORT                     | AMQP bus port                                                | y       | server          | y                  | prod                                   | n                  |
| AMQP_QUEUE_NAME               | AMQP bus queue name                                          | n       | server          | y                  | prod                                   | n                  |
| AMQP_EXCHANGE_NAME            | AMQP bus exchange name                                       | n       | server          | y                  | prod                                   | n                  |
| GRAPHQL_ENDPOINT_ENABLED      | Enable/disable GraphQL queries                               | n       | server          | y                  | prod                                   | n                  |
| GRAPHQL_ENDPOINT_URL          | GraphQL API url                                              | y       | server          | y                  | prod                                   | n                  |
| GRAPHQL_API_KEY_ENABLED       | Enable/disable key for GraphQL API authentication            | y       | server          | y                  | prod                                   | n                  |
| GRAPHQL_API_KEY               | GraphQL API key                                              | y       | server          | y                  | prod                                   | n                  |
| PERSPECTIVE_ROLES_FILTER      | Relevant user roles                                          | n       | server          | y                  | prod                                   | n                  |
| PUBLICATION_LIST_ROLES_FILTER | Relevant contributor roles                                   | n       | server          | y                  | prod                                   | n                  |
| VOCABS_URL                    | API URL for concept keyword                                  | y       | server          | y                  | prod                                   | n                  |
| NEXT_PUBLIC_AVAILABLE_VOCABS  | Available concept vocabularies                               | n       | server & client | y                  | prod                                   | n                  |
| DEFAULT_SELF_SCOPED_ROLES     | Default roles for people on their own data                   | n       | server          | y                  | prod                                   | n                  |
| NODE_TLS_REJECT_UNAUTHORIZED  | For dev with self-signed SSL                                 | n       | —               | y                  | dev                                    | n                  |
| NEXT_PUBLIC_CAS_URL           | CAS institution URL                                          | n       | server & client | n                  | prod                                   | y                  |
| NEXT_PUBLIC_INSTITUTION_NAME  | University name                                              | n       | server & client | y                  | prod                                   | n                  |
| FIELD_ENC_PRIMARY_KID         | Orcid token encryption key ID                                | n       | server          | y                  | prod                                   | n                  |
| FIELD_ENC_KEYS_JSON           | Orcid token encryption keys                                  | y       | server          | y                  | prod                                   | n                  |

6. Run the Prisma migration with `npx prisma migrate dev --name init`.
7. Run the development server with `npm run dev`.

To enable the AMQP listener, start a Rabbitmq instance on your local machine, fill in the .env file
with Rabbitmq parameters and run the listener : `npm run dev:listener`

### RBAC setup (required)

SoVisu+ uses a role-based access control (RBAC) file to seed roles & permissions into the database.

1. **Create your roles file**

   Copy the sample and edit it to match your needs:

   ```bash
   cp rbac.roles.sample.yaml rbac.roles.yaml
   # edit rbac.roles.yaml
   ```

2. **Run migrations (if not already done)**

   ```bash
   npx prisma migrate dev --name init
   ```

3. **Seed roles/permissions into the DB**

   ```bash
   # default looks for ./rbac.roles.yaml
   npm run init_roles

   # or pass an explicit file path
   npm run init_roles -- --file ./rbac.roles.yaml

   # or with compiled version
   npm run build:listener
   npm run init_roles:js ./rbac.roles.yaml
   ```

   This command is **idempotent**: run it any time you change the YAML file.

4. **Create your first admin (recommended)**
   - Sign in to the app once via Keycloak so your user is created in SoVisu+.
   - Then grant yourself a global admin role (replace `local-yourusername` with your local person UID):

   ```bash
   npm run assign_role -- \
     --role admin \
     --person-uid local-yourusername

   # or with compiled version

   npm run build:listener
   node dist-listener/src/scripts/assign_role.js --role admin --person-uid local-yourusername
   ```

See [Authorization with CASL](./authorization.md) for more details on role and permission management.
