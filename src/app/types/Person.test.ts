import { Person } from '@/types/Person'
import { Document, DocumentType } from '@/types/Document'
import { DocumentRecord } from '@/types/DocumentRecord'
import { SourceContribution } from '@/types/SourceContribution'
import { SourcePerson } from '@/types/SourcePerson'
import { SourcePersonIdentifier } from '@/types/SourcePersonIdentifier'
import { BibliographicPlatform } from '@/types/BibliographicPlatform'
import { LocRelator } from '@/types/LocRelator'
import { SourcePersonIdentifierType } from '@prisma/client'
import { describe, expect, it } from '@jest/globals'
import {
  PersonIdentifier,
  PersonIdentifierType,
} from '@/types/PersonIdentifier'

describe('Person', () => {
  it('should create a valid Person object', () => {
    const validPerson = new Person(
      'P123',
      true,
      'example@example.com',
      'John Doe',
      'John',
      'Doe',
      [
        new PersonIdentifier(PersonIdentifierType.orcid, '0000-0002-1825-0097'),
        new PersonIdentifier(PersonIdentifierType.local, '12345'),
      ],
    )

    expect(validPerson).toBeInstanceOf(Person)
    expect(validPerson.uid).toBe('P123')
    expect(validPerson.external).toBe(true)
    expect(validPerson.email).toBe('example@example.com')
    expect(validPerson.displayName).toBe('John Doe')
    expect(validPerson.firstName).toBe('John')
    expect(validPerson.lastName).toBe('Doe')
    expect(validPerson.getIdentifiers()).toEqual([
      {
        type: PersonIdentifierType.orcid,
        value: '0000-0002-1825-0097',
        validated: false,
      },
      { type: PersonIdentifierType.local, value: '12345', validated: false },
    ])
  })

  it('should throw an error for invalid identifier types', () => {
    expect(() => {
      new Person('P456', false, null, 'Jane Doe', 'Jane', 'Doe', [
        new PersonIdentifier('INVALID_TYPE' as PersonIdentifierType, '67890'),
      ])
    }).toThrowError(/INVALID_TYPE is not a valid PersonIdentifierType/)
  })

  it('should create a Person object from a DbPerson object', () => {
    const dbPerson = {
      id: 1,
      uid: 'P123',
      slug: 'alice-smith',
      external: true,
      email: 'example@example.com',
      displayName: 'John Doe',
      firstName: 'John',
      normalizedName: 'john doe',
      lastName: 'Doe',
      identifiers: [
        {
          id: 1,
          type: PersonIdentifierType.orcid,
          value: '0000-0002-1825-0097',
          personId: 1,
          validated: false,
        },
        {
          id: 2,
          type: PersonIdentifierType.local,
          value: '12345',
          personId: 2,
          validated: false,
        },
      ],
      memberships: [],
      records: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const result = Person.fromDbPerson(dbPerson)

    expect(result).toBeInstanceOf(Person)
    expect(result.uid).toBe('P123')
    expect(result.external).toBe(true)
    expect(result.email).toBe('example@example.com')
    expect(result.displayName).toBe('John Doe')
    expect(result.firstName).toBe('John')
    expect(result.lastName).toBe('Doe')
    expect(result.normalizedName).toBe('john doe')
    expect(result.getIdentifiers()).toEqual([
      {
        type: PersonIdentifierType.orcid,
        value: '0000-0002-1825-0097',
        validated: false,
      },
      { type: PersonIdentifierType.local, value: '12345', validated: false },
    ])
  })

  it('should handle an empty identifiers array if not provided', () => {
    const dbPerson = {
      id: 1,
      uid: 'P789',
      slug: 'alice-smith',
      external: false,
      email: null,
      displayName: 'Alice Smith',
      firstName: 'Alice',
      lastName: 'Smith',
      identifiers: [],
      memberships: [],
      records: [],
      normalizedName: 'alice smith',
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const result = Person.fromDbPerson(dbPerson)

    expect(result).toBeInstanceOf(Person)
    expect(result.uid).toBe('P789')
    expect(result.external).toBe(false)
    expect(result.email).toBeNull()
    expect(result.displayName).toBe('Alice Smith')
    expect(result.firstName).toBe('Alice')
    expect(result.lastName).toBe('Smith')
    expect(result.normalizedName).toBe('alice smith')
    expect(result.getIdentifiers()).toEqual([])
  })

  it('should compute the display name if an empty one is provided', () => {
    const personWithNullDisplayName = new Person(
      'P123',
      true,
      'jdoe@example.com',
      null,
      'John',
      'Doe',
      [new PersonIdentifier(PersonIdentifierType.orcid, '0000-0002-1825-0097')],
    )
    expect(personWithNullDisplayName.displayName).toBe('John Doe')
    expect(personWithNullDisplayName.normalizedName).toBe('john doe')
  })

  it('should compute the normalized name from the provided display name', () => {
    const personWithDisplayName = new Person(
      'P123',
      true,
      'jdoe@example.com',
      'John Doe Jr',
      'John',
      'Doe',
      [new PersonIdentifier(PersonIdentifierType.orcid, '0000-0002-1825-0097')],
    )
    expect(personWithDisplayName.displayName).toBe('John Doe Jr')
    expect(personWithDisplayName.normalizedName).toBe('john doe jr')
  })

  it('hasIdentifier test', () => {
    const personWithIdHal = new Person(
      'P123',
      true,
      'example@example.com',
      'John Doe',
      'John',
      'Doe',
      [
        new PersonIdentifier(PersonIdentifierType.orcid, '0000-0002-1825-0097'),
        new PersonIdentifier(PersonIdentifierType.idhals, '12345'),
      ],
    )

    expect(personWithIdHal.hasIdentifier(PersonIdentifierType.idhals)).toBe(
      true,
    )
    expect(personWithIdHal.hasIdentifier(PersonIdentifierType.orcid)).toBe(true)
    expect(personWithIdHal.hasIdentifier(PersonIdentifierType.scopus)).toBe(
      false,
    )

    const personWithoutIdHal = new Person(
      'P123',
      true,
      'example@example.com',
      'John Doe',
      'John',
      'Doe',
      [
        new PersonIdentifier(PersonIdentifierType.orcid, '0000-0002-1825-0097'),
        new PersonIdentifier(PersonIdentifierType.local, '12345'),
      ],
    )

    expect(personWithoutIdHal.hasIdentifier(PersonIdentifierType.idhals)).toBe(
      false,
    )
  })
})

describe('Person.displayIdentifiers', () => {
  const sourcePerson = (
    uid: string,
    ids: [SourcePersonIdentifierType, string][],
  ) =>
    new SourcePerson(
      uid,
      `Source ${uid}`,
      'hal',
      null,
      ids.map(([type, value]) => new SourcePersonIdentifier(type, value)),
    )

  const record = (uid: string, sourcePersons: SourcePerson[]) =>
    new DocumentRecord(
      uid,
      uid,
      [],
      sourcePersons.map(
        (item) => new SourceContribution(LocRelator.AUTHOR, item),
      ),
      [],
      null,
      BibliographicPlatform.HAL,
      [],
    )

  const documentWith = (records: DocumentRecord[]) =>
    new Document(
      'd1',
      DocumentType.Document,
      null,
      null,
      null,
      null,
      null,
      [],
      [],
      [],
      [],
      records,
    )

  const personWith = (
    sourcePersons: SourcePerson[],
    identifiers: PersonIdentifier[] = [],
  ) => {
    const person = new Person(
      'p1',
      false,
      null,
      'John Doe',
      'John',
      'Doe',
      identifiers,
    )
    person.records = sourcePersons
    return person
  }

  const pairs = (person: Person, document: Document) =>
    person
      .displayIdentifiers(document)
      .map((id) => [id.type, id.value])
      .sort()

  it('returns the own identifiers when the person has some', () => {
    const source = sourcePerson('sp1', [
      [SourcePersonIdentifierType.idref, '123456789'],
    ])
    const person = personWith(
      [source],
      [new PersonIdentifier(PersonIdentifierType.orcid, '0000-0001')],
    )
    expect(pairs(person, documentWith([record('r1', [source])]))).toEqual([
      ['orcid', '0000-0001'],
    ])
  })

  it('ignores source persons that do not contribute to the document', () => {
    const inDocument = sourcePerson('sp1', [
      [SourcePersonIdentifierType.orcid, '0000-0001'],
    ])
    const elsewhere = sourcePerson('sp2', [
      [SourcePersonIdentifierType.idref, '123456789'],
    ])
    const stranger = sourcePerson('sp3', [
      [SourcePersonIdentifierType.idhals, 'someone-else'],
    ])
    const person = personWith([inDocument, elsewhere])
    const document = documentWith([record('r1', [inDocument, stranger])])
    expect(pairs(person, document)).toEqual([['orcid', '0000-0001']])
  })

  it('deduplicates a value shared by several source persons', () => {
    const first = sourcePerson('sp1', [
      [SourcePersonIdentifierType.orcid, '0000-0002-1825-009X'],
    ])
    const second = sourcePerson('sp2', [
      [SourcePersonIdentifierType.orcid, '0000-0002-1825-009x'],
    ])
    const person = personWith([first, second])
    const document = documentWith([
      record('r1', [first]),
      record('r2', [second]),
    ])
    expect(pairs(person, document)).toEqual([['orcid', '0000-0002-1825-009X']])
  })

  it('leaves out a type with conflicting values and keeps the others', () => {
    const first = sourcePerson('sp1', [
      [SourcePersonIdentifierType.orcid, '0000-0001'],
      [SourcePersonIdentifierType.idref, '123456789'],
    ])
    const second = sourcePerson('sp2', [
      [SourcePersonIdentifierType.orcid, '0000-0002'],
    ])
    const person = personWith([first, second])
    const document = documentWith([
      record('r1', [first]),
      record('r2', [second]),
    ])
    expect(pairs(person, document)).toEqual([['idref', '123456789']])
  })

  it('leaves out the idhali when an idhals is available', () => {
    const source = sourcePerson('sp1', [
      [SourcePersonIdentifierType.idhals, 'john-doe'],
      [SourcePersonIdentifierType.idhali, '12345'],
    ])
    const person = personWith([source])
    const document = documentWith([record('r1', [source])])
    expect(pairs(person, document)).toEqual([['idhals', 'john-doe']])
  })

  it('leaves out the idhali when the idhals values conflict', () => {
    const first = sourcePerson('sp1', [
      [SourcePersonIdentifierType.idhals, 'john-doe'],
      [SourcePersonIdentifierType.idhali, '12345'],
    ])
    const second = sourcePerson('sp2', [
      [SourcePersonIdentifierType.idhals, 'j-doe'],
    ])
    const person = personWith([first, second])
    const document = documentWith([
      record('r1', [first]),
      record('r2', [second]),
    ])
    expect(pairs(person, document)).toEqual([])
  })

  it('keeps the idhali when there is no idhals', () => {
    const source = sourcePerson('sp1', [
      [SourcePersonIdentifierType.idhali, '12345'],
    ])
    const person = personWith([source])
    const document = documentWith([record('r1', [source])])
    expect(pairs(person, document)).toEqual([['idhali', '12345']])
  })

  it('returns nothing when no source person contributes to the document', () => {
    const elsewhere = sourcePerson('sp1', [
      [SourcePersonIdentifierType.orcid, '0000-0001'],
    ])
    const person = personWith([elsewhere])
    expect(pairs(person, documentWith([record('r1', [])]))).toEqual([])
  })
})
