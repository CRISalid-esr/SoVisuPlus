# Hide structures — per-structure toggle and `structure_manager` permission

## Intent

The research-structures directory shows every `OrganizationUnit` the ETL pushes into
SoVisuPlus. A fair share of them are noise for end users: registry stubs, defunct
services, duplicates, structures an institution simply does not want surfaced. Until now
nothing about a structure was editable from the UI — there was no write endpoint under
`/api/organizations` and no permission check anywhere under `research-structures/`.

This feature adds a per-structure **hidden** flag, toggled from the Arborescence detail
panel by a holder of the new **`structure_manager`** role, plus a global "show hidden
structures" switch so the same user can bring one back.

## Decisions

| Question         | Decision                                                                                            |
| ---------------- | --------------------------------------------------------------------------------------------------- |
| Permission       | `action: update`, `subject: OrganizationUnit`, `fields: [hidden]` in a `structure_manager` role     |
| Scoping          | **Global only** — no `authzProperties` on `OrganizationUnit`, no scoped assignment (`admin` exempt) |
| Cascade          | Hiding a structure hides its **whole subtree**, except descendants reachable by another parent      |
| Reach            | Structures page, sidebar search, perspective resolution, directory KPIs, affiliation displays       |
| Audit            | Just the boolean — no `hiddenAt` / `hiddenById`                                                     |
| Toggle placement | Arborescence detail panel only (no column in the "Liste" tab)                                       |

## Design

### Two columns, one derived

`OrganizationUnit` gains two booleans:

- **`hidden`** — the explicit toggle, written only by the PATCH route.
- **`hiddenEffective`** — derived; the single flag every read path filters on.

```
effective(u) = u.hidden || (u has parents && every parent p: effective(p))
```

`hidden` alone cannot express the cascade, since visibility depends on the whole ancestor
DAG, and threading a computed set through the search where-clause, the directory, the slug
route and the person payload would be invasive and slow (the sidebar search fires per
keystroke, per group). Materialising the outcome turns every read back into
`where: { hiddenEffective: false }`.

Keeping the two apart is also what makes **unhiding** correct: if the cascade were written
into `hidden` itself, hiding an institution would set `hidden = true` on every descendant
and unhiding it later could not tell which of them had been hidden individually
beforehand — they would all come back.

Both relationship kinds (`part_of` and `member_of`) count as parent links, matching the
edge set `buildDirectoryForest` walks. Roots are hidden only when explicit; a structure
with one hidden and one visible parent stays visible and simply shows under the visible
one. The propagation is monotone, so a parent-pointer cycle in bad upstream data converges
instead of hiding the cycle.

Recomputed after a hide/unhide and after every `OrganizationUnitWorker` upsert, since the
ETL replaces the parent relationships wholesale. `createOrUpdateOrganizationUnit`'s
`scalarFields` deliberately does **not** include `hidden`, which is what makes the flag
survive graph events.

### Permission check with a global-only role

`OrganizationUnit` has no `authzProperties`, so `detectSubjectType` falls through to
`'all'` for an instance — checks have to be made against the subject **type**. But CASL
ignores conditions on a type-only check, so a mistakenly scoped assignment would pass.
`hasUnscopedPermission(authz, action, subject, field?)` in `src/app/auth/ability.ts`
answers precisely: it requires an assignment that no scope narrows. Two things qualify —
an assignment with no scopes at all, or a `manage` / `all` permission, the admin wildcard,
which grants full access however it was assigned (scoping `manage all` narrows the
perimeter of the subjects that _have_ one, and `OrganizationUnit` has none, so a
research-unit-scoped admin still manages structure visibility). Outside the wildcard,
`manage` still matches any action and `all` any subject. It is used on both sides — server
(`PATCH`, the `includeHidden` gate, the slug and members guards) and client (rendering the
switches). No `<Can>`, since the subject is a type rather than an instance.

## Surfaces

| Surface                                | Behaviour                                                                    |
| -------------------------------------- | ---------------------------------------------------------------------------- |
| Structures page (3 tabs + CSV export)  | Hidden structures absent, unless "show hidden" is on for a structure manager |
| Sidebar perspective search             | Hidden structures never returned, structure managers included                |
| `GET /api/organizations/slug/[slug]`   | 404 for a hidden structure unless the caller can manage visibility           |
| `GET /api/organizations/[uid]/members` | Same guard                                                                   |
| Directory KPIs                         | Memberships toward a hidden structure drop out of the parent perimeters      |
| `PersonIdentityCard` affiliations      | A hidden structure is not named                                              |

### Known limit

`ContributorIdentityCard` (document author affiliations) reads `Contribution.affiliations`
→ **`AuthorityOrganization`**, a model harvested from source records with its own uids and
**no relation to `OrganizationUnit`**. Hiding cannot apply there, and the card is left
untouched.

### Authorization is not affected

`Person.authzProperties` builds authorization perimeters from `person.memberships` via
`organizationPerimeterFromMemberships`. Memberships are therefore **not** filtered in
`PersonDAO` — hiding a structure must never silently change anyone's permissions. The
affiliation filter is applied in the display component only.

## Key files

| Concern                     | File                                                                        |
| --------------------------- | --------------------------------------------------------------------------- |
| Columns + PermissionSubject | `prisma/schema.prisma`, `prisma/migrations/20260831131951_hide_structures/` |
| Role                        | `rbac.roles.yaml`, `rbac.roles.sample.yaml`                                 |
| Permission check            | `src/app/auth/ability.ts`, `src/app/auth/structureVisibility.ts`            |
| Cascade                     | `src/app/lib/services/organizationVisibility.ts`                            |
| Reads / writes              | `src/app/lib/daos/OrganizationUnitDAO.ts`                                   |
| Orchestration               | `src/app/lib/services/OrganizationUnitService.ts`                           |
| Recompute after ETL         | `src/app/lib/amqp/workers/OrganizationUnitWorker.ts`                        |
| Write endpoint              | `src/app/api/organizations/[uid]/route.ts`                                  |
| Global switch               | `src/app/[lang]/research-structures/page.tsx`                               |
| Per-structure toggle        | `src/app/[lang]/research-structures/components/StructureDetail.tsx`         |
| Dimmed rows / chips         | `StructureTreeExplorer.tsx`, `StructureNameCell.tsx`                        |
| Store                       | `src/app/stores/organizationUnitSlice.ts`                                   |
| Affiliation filter          | `src/app/[lang]/dashboard/components/PersonIdentityCard.tsx`                |

## Assigning the role

```bash
npm run init_roles
npm run assign_role -- --role structure_manager --person-uid <personUid>
```

No `--scope`: a scoped assignment grants nothing here, by design.
