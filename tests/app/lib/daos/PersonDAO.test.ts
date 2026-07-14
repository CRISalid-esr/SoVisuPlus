import { PersonDAO } from '@/lib/daos/PersonDAO'
import { Person } from '@/types/Person'
import prisma from '@/lib/daos/prisma'
import { PersonMembership } from '@/types/PersonMembership'
import { PersonEmployment } from '@/types/PersonEmployment'
import { OrganizationUnit } from '@/types/OrganizationUnit'
import { Literal } from '@/types/Literal'
import { OrganizationUnitDAO } from '@/lib/daos/OrganizationUnitDAO'
import { OrganizationCategory, OrganizationGenericType } from '@prisma/client'
import {
  PersonIdentifier,
  PersonIdentifierType,
} from '@/types/PersonIdentifier'

describe('PersonDAO Integration Tests', () => {
  let personDAO: PersonDAO

  beforeAll(() => {
    personDAO = new PersonDAO()
  })

  const person: Person = new Person(
    'local-johndoe',
    false,
    'johndoe@example.com',
    'John',
    'Doe',
    'John Doe',
    [new PersonIdentifier(PersonIdentifierType.orcid, '0000-0001-2345-6789')],
    [
      new PersonMembership(
        new OrganizationUnit(
          'local-unit',
          'ACR',
          [new Literal('JD Laboratory', 'en')],
          [new Literal('Laboratory of John Doe', 'en')],
          OrganizationCategory.research_unit,
          OrganizationGenericType.unit,
        ),
        null,
        null,
        'MCF',
      ),
    ],
  )

  test('should create a new person with identifiers', async () => {
    const dbPerson = await personDAO.createOrUpdatePerson(person)

    expect(dbPerson).toHaveProperty('id')
    expect(dbPerson.uid).toBe(person.uid)
    expect(dbPerson.email).toBe(person.email)

    const savedIdentifiers = await prisma.personIdentifier.findMany({
      where: { personId: dbPerson.id },
    })

    expect(savedIdentifiers).toHaveLength(1)
    expect(savedIdentifiers[0]).toMatchObject({
      type: PersonIdentifierType.orcid,
      value: '0000-0001-2345-6789',
      personId: dbPerson.id,
    })
  })

  test('should create a new person with memberships', async () => {
    const organizationUnitDAO = new OrganizationUnitDAO()
    const organizationUnit =
      await organizationUnitDAO.createOrUpdateOrganizationUnit(
        new OrganizationUnit(
          'local-unit',
          'ACR',
          [new Literal('JD Laboratory', 'en')],
          [new Literal('Laboratory of John Doe', 'en')],
          OrganizationCategory.research_unit,
          OrganizationGenericType.unit,
        ),
      )
    const dbPerson = await personDAO.createOrUpdatePerson(person)

    expect(dbPerson).toHaveProperty('id')
    expect(dbPerson.uid).toBe(person.uid)
    expect(dbPerson.email).toBe(person.email)

    const savedMemberships = await prisma.membership.findMany({
      where: { personId: dbPerson.id },
      include: { organizationUnit: true },
    })

    expect(savedMemberships).toHaveLength(1)
    expect(savedMemberships[0]).toMatchObject({
      personId: dbPerson.id,
      organizationUnitId: organizationUnit.id,
      positionCode: 'MCF',
    })
  })

  test('should create a new person with employments', async () => {
    const organizationUnitDAO = new OrganizationUnitDAO()
    const institution =
      await organizationUnitDAO.createOrUpdateOrganizationUnit(
        new OrganizationUnit(
          'local-UP1',
          'UP1',
          [new Literal('Université Paris 1', 'fr')],
          [],
          OrganizationCategory.institution,
          OrganizationGenericType.institution,
        ),
      )
    // membership organization also present so both relations resolve
    await organizationUnitDAO.createOrUpdateOrganizationUnit(
      new OrganizationUnit(
        'local-unit',
        'ACR',
        [new Literal('JD Laboratory', 'en')],
        [],
        OrganizationCategory.research_unit,
        OrganizationGenericType.unit,
      ),
    )

    const employedPerson = new Person(
      'local-johndoe',
      false,
      'johndoe@example.com',
      'John',
      'Doe',
      'John Doe',
      [],
      person.memberships,
    )
    employedPerson.employments = [
      new PersonEmployment(
        new OrganizationUnit(
          'local-UP1',
          'UP1',
          [new Literal('Université Paris 1', 'fr')],
          [],
          OrganizationCategory.institution,
          OrganizationGenericType.institution,
        ),
        '2018-09-01T00:00:00.000Z',
        null,
        'MCF',
      ),
    ]

    const dbPerson = await personDAO.createOrUpdatePerson(employedPerson)

    const savedEmployments = await prisma.employment.findMany({
      where: { personId: dbPerson.id },
    })
    expect(savedEmployments).toHaveLength(1)
    expect(savedEmployments[0]).toMatchObject({
      personId: dbPerson.id,
      organizationUnitId: institution.id,
      positionCode: 'MCF',
    })

    // round-trip through fetchPersonByUid
    const fetched = await personDAO.fetchPersonByUid('local-johndoe')
    expect(fetched!.employments).toHaveLength(1)
    expect(fetched!.employments[0].organizationUnit.uid).toBe('local-UP1')
    expect(fetched!.employments[0].organizationUnit.category).toBe(
      OrganizationCategory.institution,
    )
  })

  test('should skip employments whose organization is unknown', async () => {
    const employedPerson = new Person(
      'local-johndoe',
      false,
      'johndoe@example.com',
      'John',
      'Doe',
      'John Doe',
      [],
      [],
    )
    employedPerson.employments = [
      new PersonEmployment(
        new OrganizationUnit(
          'local-MISSING',
          null,
          [],
          [],
          OrganizationCategory.institution,
          OrganizationGenericType.institution,
        ),
      ),
    ]

    const dbPerson = await personDAO.createOrUpdatePerson(employedPerson)

    const savedEmployments = await prisma.employment.findMany({
      where: { personId: dbPerson.id },
    })
    expect(savedEmployments).toHaveLength(0)
  })

  test('should update an existing person and replace identifiers', async () => {
    const initialPerson = await prisma.person.create({
      data: {
        uid: person.uid,
        email: 'old-email@example.com',
        firstName: 'Old',
        lastName: 'Name',
      },
    })

    await prisma.personIdentifier.createMany({
      data: [
        {
          type: PersonIdentifierType.orcid,
          value: '0000-0001-1111-1111',
          personId: initialPerson.id,
        },
      ],
    })

    const updatedPerson = await personDAO.createOrUpdatePerson(person)

    expect(updatedPerson.email).toBe(person.email)
    expect(updatedPerson.firstName).toBe(person.firstName)
    expect(updatedPerson.lastName).toBe(person.lastName)

    const updatedIdentifiers = await prisma.personIdentifier.findMany({
      where: { personId: updatedPerson.id },
    })

    expect(updatedIdentifiers).toHaveLength(1)
    expect(updatedIdentifiers[0]).toMatchObject({
      type: PersonIdentifierType.orcid,
      value: '0000-0001-2345-6789',
    })
  })

  test('should throw an error if conflicting identifiers are found', async () => {
    const conflictingPerson = await prisma.person.create({
      data: {
        uid: 'conflicting-person',
        email: 'conflict@example.com',
        firstName: 'Conflict',
        lastName: 'Person',
      },
    })

    await prisma.personIdentifier.create({
      data: {
        type: PersonIdentifierType.orcid,
        value: '0000-0001-2345-6789',
        personId: conflictingPerson.id,
      },
    })

    await expect(personDAO.createOrUpdatePerson(person)).rejects.toThrow(
      'Failed to upsert person: Conflicting identifiers found: orcid:0000-0001-2345-6789',
    )
  })

  test('should remove old identifiers and add new ones for the same person', async () => {
    const initialPerson = await prisma.person.create({
      data: {
        uid: person.uid,
        email: person.email,
        firstName: person.firstName,
        lastName: person.lastName,
      },
    })

    await prisma.personIdentifier.createMany({
      data: [
        {
          type: PersonIdentifierType.orcid,
          value: '0000-0001-1111-1111',
          personId: initialPerson.id,
        },
      ],
    })

    const newPersonData = person
    newPersonData.setIdentifiers([
      new PersonIdentifier(PersonIdentifierType.scopus, '1234-5678-9012'),
      new PersonIdentifier(PersonIdentifierType.idref, 'AB-1234-5678'),
    ])

    const updatedPerson = await personDAO.createOrUpdatePerson(newPersonData)

    const updatedIdentifiers = await prisma.personIdentifier.findMany({
      where: { personId: updatedPerson.id },
    })

    expect(updatedIdentifiers).toHaveLength(2)
    expect(updatedIdentifiers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: PersonIdentifierType.scopus,
          value: '1234-5678-9012',
        }),
        expect.objectContaining({
          type: PersonIdentifierType.idref,
          value: 'AB-1234-5678',
        }),
      ]),
    )
  })

  test('should delete an idref identifier without touching other identifiers on the same person', async () => {
    const dbPerson = await prisma.person.create({
      data: {
        uid: 'local-deletetest',
        email: 'deletetest@example.com',
        firstName: 'Test',
        lastName: 'Delete',
        identifiers: {
          createMany: {
            data: [
              { type: PersonIdentifierType.idref, value: '127220747' },
              {
                type: PersonIdentifierType.orcid,
                value: '0000-0001-9999-9999',
              },
            ],
          },
        },
      },
    })

    await personDAO.deleteIdentifier(dbPerson.uid, PersonIdentifierType.idref)

    const remaining = await prisma.personIdentifier.findMany({
      where: { personId: dbPerson.id },
    })

    expect(remaining).toHaveLength(1)
    expect(remaining[0].type).toBe(PersonIdentifierType.orcid)
  })

  test('deleteIdentifier is a no-op when the identifier does not exist', async () => {
    const dbPerson = await prisma.person.create({
      data: {
        uid: 'local-nodelete',
        email: 'nodelete@example.com',
        firstName: 'No',
        lastName: 'Delete',
      },
    })

    // idref was never created — deleteMany returns count 0, no throw
    await expect(
      personDAO.deleteIdentifier(dbPerson.uid, PersonIdentifierType.idref),
    ).resolves.toBeUndefined()

    const remaining = await prisma.personIdentifier.findMany({
      where: { personId: dbPerson.id },
    })
    expect(remaining).toHaveLength(0)
  })

  test('should throw when deleteIdentifier is called with an unknown person uid', async () => {
    await expect(
      personDAO.deleteIdentifier('nonexistent-uid', PersonIdentifierType.idref),
    ).rejects.toThrow('Person with UID nonexistent-uid not found')
  })

  test('deleting an idHAL cascades to its companion hal_login', async () => {
    const dbPerson = await prisma.person.create({
      data: {
        uid: 'local-halcascade',
        email: 'halcascade@example.com',
        firstName: 'Hal',
        lastName: 'Cascade',
        identifiers: {
          createMany: {
            data: [
              { type: PersonIdentifierType.idhals, value: 'jacques-dupont' },
              { type: PersonIdentifierType.hal_login, value: 'jdupont' },
            ],
          },
        },
      },
    })

    await personDAO.deleteIdentifier(dbPerson.uid, PersonIdentifierType.idhals)

    const remaining = await prisma.personIdentifier.findMany({
      where: { personId: dbPerson.id },
    })
    expect(remaining).toHaveLength(0)
  })

  test('createIdentifier throws IdentifierConflictError when the type already exists', async () => {
    const { IdentifierConflictError } = await import('@/lib/daos/PersonDAO')
    const dbPerson = await prisma.person.create({
      data: {
        uid: 'local-createconflict',
        email: 'createconflict@example.com',
        firstName: 'Create',
        lastName: 'Conflict',
        identifiers: {
          create: { type: PersonIdentifierType.idref, value: '127220747' },
        },
      },
    })

    await expect(
      personDAO.createIdentifier(
        new PersonIdentifier(PersonIdentifierType.idref, '111111111'),
        dbPerson.uid,
      ),
    ).rejects.toBeInstanceOf(IdentifierConflictError)
  })

  test('should append -1 to the slug when a second person with the same name is added', async () => {
    const person1 = new Person(
      'local-johndoe-1',
      false,
      'johndoe1@example.com',
      'John Doe',
      'John',
      'Doe',
      [new PersonIdentifier(PersonIdentifierType.orcid, '0000-0001-2345-6789')],
    )

    const person2 = new Person(
      'local-johndoe-2',
      false,
      'johndoe2@example.com',
      'John Doe',
      'John',
      'Doe',
      [new PersonIdentifier(PersonIdentifierType.orcid, '0000-0001-9876-5432')],
    )

    // Insert first person
    const dbPerson1 = await personDAO.createOrUpdatePerson(person1)
    expect(dbPerson1.slug).toBe('person:john-doe') // First one gets base slug

    // Insert second person with the same name
    const dbPerson2 = await personDAO.createOrUpdatePerson(person2)
    expect(dbPerson2.slug).toBe('person:john-doe-1') // Second one gets -1 suffix

    // Ensure both records exist in the database
    const savedPeople = await prisma.person.findMany({
      where: { lastName: 'Doe', firstName: 'John' },
    })

    expect(savedPeople).toHaveLength(2)
    expect(savedPeople.map((p) => p.slug)).toEqual([
      'person:john-doe',
      'person:john-doe-1',
    ])
  })
})
