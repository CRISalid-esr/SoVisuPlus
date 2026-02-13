import { Person } from '@/types/Person'
import { PersonIdentifierType } from '@prisma/client'
import { describe, expect, it } from '@jest/globals'
import { PersonIdentifier } from '@/types/PersonIdentifier'

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
      { type: PersonIdentifierType.orcid, value: '0000-0002-1825-0097' },
      { type: PersonIdentifierType.local, value: '12345' },
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
        { type: PersonIdentifierType.orcid, value: '0000-0002-1825-0097' },
        { type: PersonIdentifierType.local, value: '12345' },
      ],
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
      { type: PersonIdentifierType.orcid, value: '0000-0002-1825-0097' },
      { type: PersonIdentifierType.local, value: '12345' },
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
})
