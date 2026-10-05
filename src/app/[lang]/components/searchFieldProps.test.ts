import { searchFieldProps } from './searchFieldProps'

describe('searchFieldProps', () => {
  it('limits the input length and keeps autocomplete off', () => {
    expect(searchFieldProps(200)).toEqual({
      slotProps: { htmlInput: { autoComplete: 'off', maxLength: 200 } },
    })
  })
})
