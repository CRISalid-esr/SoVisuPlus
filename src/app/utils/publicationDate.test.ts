import dayjs from 'dayjs'
import {
  formatPublicationDate,
  parsePublicationDate,
  serializePublicationDate,
} from './publicationDate'

describe('parsePublicationDate', () => {
  it('parses a year-only value', () => {
    const { day, precision } = parsePublicationDate('2024')
    expect(precision).toBe('year')
    expect(day?.format('YYYY')).toBe('2024')
  })

  it('parses a month-year value', () => {
    const { day, precision } = parsePublicationDate('2024-05')
    expect(precision).toBe('month')
    expect(day?.format('YYYY-MM')).toBe('2024-05')
  })

  it('parses a full date value', () => {
    const { day, precision } = parsePublicationDate('2024-05-12')
    expect(precision).toBe('day')
    expect(day?.format('YYYY-MM-DD')).toBe('2024-05-12')
  })

  it('returns a null day for missing input', () => {
    expect(parsePublicationDate(null).day).toBeNull()
    expect(parsePublicationDate('').day).toBeNull()
  })

  it('returns a null day for an invalid value', () => {
    expect(parsePublicationDate('not-a-date').day).toBeNull()
    expect(parsePublicationDate('2024-13').day).toBeNull()
    expect(parsePublicationDate('2024-05-12-01').day).toBeNull()
  })
})

describe('serializePublicationDate', () => {
  const day = dayjs('2024-05-12', 'YYYY-MM-DD')

  it('serializes per precision', () => {
    expect(serializePublicationDate(day, 'year')).toBe('2024')
    expect(serializePublicationDate(day, 'month')).toBe('2024-05')
    expect(serializePublicationDate(day, 'day')).toBe('2024-05-12')
  })

  it('round-trips through parse', () => {
    for (const value of ['2024', '2024-05', '2024-05-12']) {
      const { day: parsed, precision } = parsePublicationDate(value)
      expect(serializePublicationDate(parsed!, precision)).toBe(value)
    }
  })
})

describe('formatPublicationDate', () => {
  it('formats year precision verbatim', () => {
    expect(formatPublicationDate('2024', 'en')).toBe('2024')
  })

  it('formats month precision as month and year', () => {
    expect(formatPublicationDate('2024-05', 'en')).toBe('May 2024')
  })

  it('formats full date using the locale format', () => {
    expect(formatPublicationDate('2024-05-12', 'en')).toBe('05-12-2024')
    expect(formatPublicationDate('2024-05-12', 'fr')).toBe('12-05-2024')
  })

  it('returns the value verbatim when it is not a valid partial date', () => {
    expect(formatPublicationDate('in press', 'en')).toBe('in press')
  })
})
