import { parseHalDepositError } from './halDepositErrorFormat'

describe('parseHalDepositError', () => {
  it('splits the summary from a JSON verbose description', () => {
    const parsed = parseHalDepositError(
      'Some parameters sent with the request were not understood\n{"duplicate-entry":"Vincent Lhomme. <i>Title</i> <a href=\\"https://hal\\">link</a>"}',
    )
    expect(parsed.summary).toBe(
      'Some parameters sent with the request were not understood',
    )
    expect(parsed.reasons).toEqual([
      {
        key: 'duplicate-entry',
        valueHtml: 'Vincent Lhomme. <i>Title</i> <a href="https://hal">link</a>',
      },
    ])
  })

  it('exposes every key/value pair of the verbose description', () => {
    const parsed = parseHalDepositError(
      'Invalid metadata\n{"missing-title":"A title is required","bad-date":"Unparseable date"}',
    )
    expect(parsed.reasons).toEqual([
      { key: 'missing-title', valueHtml: 'A title is required' },
      { key: 'bad-date', valueHtml: 'Unparseable date' },
    ])
  })

  it('turns a nested object into a branch node with children', () => {
    const parsed = parseHalDepositError(
      'Invalid\n{"a":"<i>x</i>","group":{"nested-key":"<a href=\\"h\\">y</a>"}}',
    )
    expect(parsed.reasons).toEqual([
      { key: 'a', valueHtml: '<i>x</i>' },
      {
        key: 'group',
        children: [{ key: 'nested-key', valueHtml: '<a href="h">y</a>' }],
      },
    ])
  })

  it('recurses through several levels of nesting', () => {
    const parsed = parseHalDepositError(
      'Invalid\n{"l1":{"l2":{"l3":"deep"}}}',
    )
    expect(parsed.reasons).toEqual([
      {
        key: 'l1',
        children: [
          { key: 'l2', children: [{ key: 'l3', valueHtml: 'deep' }] },
        ],
      },
    ])
  })

  it('treats arrays as leaf values (not branches)', () => {
    const parsed = parseHalDepositError('Invalid\n{"tags":["a","b"]}')
    expect(parsed.reasons).toEqual([{ key: 'tags', valueHtml: 'a,b' }])
  })

  it('returns null reasons for a non-JSON error string', () => {
    const parsed = parseHalDepositError('HAL responded 502: <html>Bad Gateway</html>')
    expect(parsed.summary).toBeNull()
    expect(parsed.reasons).toBeNull()
  })

  it('returns null reasons for a plain transport error', () => {
    const parsed = parseHalDepositError('ECONNREFUSED')
    expect(parsed.summary).toBeNull()
    expect(parsed.reasons).toBeNull()
  })
})
