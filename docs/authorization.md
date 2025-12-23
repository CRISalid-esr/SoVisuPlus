# Authorization (RBAC)

SoVisu+ comes with a flexible, scope-aware RBAC system powered by [CASL](https://casl.js.org/).
You define **roles** and their **permissions** in a YAML file, seed them into the database,
and then **assign roles to users** with optional **scopes** (Person, ResearchStructure, Institution,
InstitutionDivision).

---

## 1) Roles YAML: structure & example

Create a `rbac.roles.yaml` at the root of your instance. Each role has:

- `name`: unique role name
- `system` (optional): if `true`, marks a system role
- `description` (optional)
- `permissions`: list of rules, each with
  - `action`: one of your domain actions (e.g. `manage`, `read`, `update`, `delete`, `merge`, `unmerge`...)
  - `subject`: the domain entity (`Document`, `DocumentRecord`, `Person`, `ResearchStructure`, or `all`)
  - `fields` (optional): field-level permissions for `update` (e.g. `titles`, `abstracts`)

```yaml
# file: rbac.roles.yaml
roles:
  - name: admin
    system: true
    description: Full access
    permissions:
      - action: manage
        subject: all

  - name: document_editor
    description: Edit document metadata
    permissions:
      - action: update
        subject: Document
        fields: [titles, abstracts, contributors, identifiers]

  - name: document_merger
    description: Merge / unmerge documents and source records
    permissions:
      - action: merge
        subject: Document
      - action: unmerge
        subject: DocumentRecord

  - name: person_identifier_manager
    description: Edit person identifiers
    permissions:
      - action: update
        subject: Person
        fields: [identifiers]
```

### Notes

- We created a small set of roles and rely on **polymorphic scopes** when assigning them:
  - Scope to a **Person** → “this user can edit/merge documents to which this person is a contributor”
  - Scope to a **ResearchStructure** → “this user can edit/merge documents that involve members of that structure as
    contributors”
  - Scope to an **Institution** or **InstitutionDivision** → similar idea, broader perimeters

- Field-level checks are supported via `fields` (e.g. for `update` actions)

---

## 2) Reset (seed) roles & permissions in the database

After editing `rbac.roles.yaml`, run:

```bash
npm run init_roles
```

What this does:

- Parses and validates `rbac.roles.yaml`
- **Upserts** `Role` and `Permission` rows
- Updates `RolePermission` links
- Idempotent: safe to run multiple times
- **Does not** touch user assignments (`UserRole` / `UserRoleScope`) except to remove assignments of deleted roles

---

## 3) Assign roles to users (with optional scope)

Use the CLI:

```bash
npm run assign_role -- \
  --role <roleName> \
  [--person-uid <personUid> | --user-id <id> | --id-type <IdentifierType> --id-value <value>] \
  [--scope <EntityType:entityUid>]
```

### User selector (choose exactly one)

- `--person-uid local-jdupont`
- or `--user-id 42`
- or `--id-type LOCAL --id-value local-jdupont` (any supported identifier type)

### Scope (optional)

- `--scope Person:local-jdupont`
- `--scope ResearchStructure:local-lpnc`
- `--scope Institution:my-institution`
- `--scope InstitutionDivision:division-123`
- Omit `--scope` for a **global** role (applies everywhere)

### Examples

Give **Jean Dupont** editor & merger rights **on their own publications**:

```bash
npm run assign_role -- \
  --role document_merger \
  --scope Person:local-jdupont \
  --person-uid local-jdupont

npm run assign_role -- \
  --role document_editor \
  --scope Person:local-jdupont \
  --person-uid local-jdupont
```

Make **J. Durand** an editor for **all publications involving LPNC**:

```bash
npm run assign_role -- \
  --role document_editor \
  --scope ResearchStructure:local-lpnc \
  --person-uid local-jdurand
```

Grant a **global** merger role to an admin user:

```bash
npm run assign_role -- \
  --role document_merger \
  --person-uid local-admin
```

---

## 4) Default self-scoped roles (user → their own Person)

You can automatically grant a set of roles to **every user on their own scope** (`Person:<theirUid>`) : the command is \*
\*idempotent\*\* (safe to run anytime).

### One-shot seeding for all existing users

```bash
# Seeds defaults for all users that have a linked person (person.uid)
# Defaults: document_editor, document_fetcher, document_merger
npm run seed:self-scoped-defaults

# Or customize the roles via env:
DEFAULT_SELF_SCOPED_ROLES="document_editor,document_fetcher" npm run seed:self-scoped-defaults
```

### NPM scripts

Example uses:

```bash
npm run seed:self-scoped-defaults
#or
npm run seed:self-scoped-default:js
```

---

## Development

### Example: add a new permission to **fetch documents** for a **Person**

#### 1) Update Prisma schema

Add the new action to your `PermissionAction` enum:

```prisma
// prisma/schema.prisma
enum PermissionAction {
  manage
  read
  create
  update
  delete
  merge
  unmerge
  fetch_documents
}
```

Run a migration:

```bash
npx prisma migrate dev --name "add-fetch-documents-permission"
```

#### 2) Extend the roles YAML

Add a role that grants this new action on **Person**:

```yaml
# rbac.roles.yaml (excerpt)
roles:
  - name: document_fetcher
    description: Fetch documents from external sources
    permissions:
      - action: fetch_documents
        subject: Person
```

Re-seed roles into the database:

```bash
npm run init_roles -- --file rbac.roles.yaml

# or with compiled version
npm run build:listener
npm run init_roles:js ./rbac.roles.yaml
```

#### 3) Assign the role to users

Scope it to a specific Person (typical case: a researcher can fetch their own documents):

```bash
npm run assign_role -- \
  --role document_fetcher \
  --scope Person:local-jdupont \
  --person-uid local-jdupont

# or with compiled version

npm run build:listener
node dist-listener/src/scripts/assign_role.js \
  --role document_fetcher \
  --scope Person:local-jdupont \
  --person-uid local-jdupont
```

Or assign globally (no scope) so they can fetch for any person:

```bash
npm run assign_role -- \
  --role document_fetcher \
  --person-uid local-librarian
```

#### 4) Permission checks

> ⚠️ **Warning:** Client-side permission checks are **not a security measure**. They only hide or disable UI. Always
> re-check authorization on the **server** (e.g. call `ability.can(...)`).

**Client side (React):**

If the page doesn’t already set up ability:

```tsx
import { useMemo } from 'react'
import { useSession } from 'next-auth/react'
import { abilityFromAuthzContext } from '@/app/auth/ability'
import { Can } from '@casl/react'
import { PermissionAction, PermissionSubject } from '@/types/Permission'

const { data: session } = useSession()
const ability = useMemo(
  () => abilityFromAuthzContext(session?.user?.authz),
  [session?.user?.authz],
)
```

Wrap your button with `<Can>` using the current perspective as subject (it's a Person or a ResearchStructure instance):

```tsx
{
  currentPerspective && (
    <Can
      I={PermissionAction.fetch_documents}
      a={currentPerspective}
      ability={ability}
    >
      <Button onClick={() => setOpenSynchronizeModal(true)}>
        Synchronize / Fetch
      </Button>
    </Can>
  )
}
```

or with passthrough:

```tsx
<Can
  I={PermissionAction.fetch_documents}
  a={currentPerspective}
  passThrough
  ability={ability}
>
  {(allowed: boolean) => (
    <Button
      startIcon={
        isAnyHarvestingRunning ? (
          <CircularProgress size={18} thickness={4} />
        ) : (
          <SyncIcon />
        )
      }
      variant='outlined'
      disabled={!allowed}
      onClick={() => setOpenSynchronizeModal(true)}
    >
      <Trans id='documents_page_synchronize_button' />
    </Button>
  )}
</Can>
```

**Server side (API/route):**

> You should always verify permissions on the server. Client-side checks (e.g., using `<Can>`) are only for UX and must
> not be treated as a security measure.

```ts
import { getServerSession } from 'next-auth'
import authOptions from '@/app/auth/auth_options'
import { abilityFromAuthzContext } from '@/app/auth/ability'
import { PermissionAction } from '@/types/Permission'

export const POST = async (req: Request) => {
  const session = await getServerSession(authOptions)
  if (!session?.user?.authz) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const ability = abilityFromAuthzContext(session.user.authz)

  // Option A: without instance
  //const canFetch = ability.can(PermissionAction.fetch_documents, PermissionSubject.Person)

  // Option B: get the person from the database (if you need to check against a specific instance)
  const targetPerson = await personDAO.fetchPersonByUid(personUid)
  if (!targetPerson) {
    return NextResponse.json(
      { error: 'Unknown target person' },
      { status: 404 },
    )
  }

  const canFetch = ability.can(PermissionAction.fetch_documents, targetPerson)
  if (!canFetch) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // ...perform fetch job
  return NextResponse.json({ ok: true })
}
```

Fix your tests :

- in server side tests, add an authz context with the right permissions

```ts
const authz = makeAuthzContext({
  roleAssignments: [
    makeAssignment(
      'document_fetcher',
      [
        {
          action: PermissionAction.fetch_documents,
          subject: PermissionSubject.Person,
        },
      ],
      [{ entityType: 'Person', entityUid: 'abc' }],
    ),
  ],
})

;(getServerSession as jest.Mock).mockResolvedValue({
  user: { username: 'jdoe', authz },
  expires: '2025-01-01T00:00:00.000Z',
})
;(PersonDAO as unknown as jest.Mock).mockImplementation(() => ({
  fetchPersonByUid: jest.fn().mockResolvedValue({
    uid: 'abc',
    authzProperties: {
      __type: 'Person',
      perimeter: { Person: ['abc'], ResearchStructure: [] },
    },
  }),
}))
```
