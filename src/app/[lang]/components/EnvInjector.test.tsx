import React from 'react'
import '@testing-library/jest-dom'
import { render } from '@testing-library/react'
import { EnvInjector } from './EnvInjector'

describe('EnvInjector', () => {
  test('renders a script that assigns window.env with the provided env object', () => {
    const env = {
      NEXT_PUBLIC_API_URL: 'https://example.test',
      NEXT_PUBLIC_FEATURE_FLAG: 'true',
    }

    const { container } = render(<EnvInjector env={env} />)

    const script = container.querySelector('script')
    expect(script).toBeInTheDocument()

    expect(script?.innerHTML).toBe(`window.env = ${JSON.stringify(env)};`)
  })

  test('throws if a non NEXT_PUBLIC_ key is provided (startup should fail)', () => {
    const env = {
      NEXT_PUBLIC_OK: 'ok',
      DATABASE_URL: 'postgres://should-not-leak',
    }

    expect(() => render(<EnvInjector env={env} />)).toThrow(
      /Only NEXT_PUBLIC_ variables are allowed/i,
    )
  })

  test('does not throw with an empty env object', () => {
    const { container } = render(<EnvInjector env={{}} />)
    const script = container.querySelector('script')
    expect(script).toBeInTheDocument()
    expect(script?.innerHTML).toBe(`window.env = ${JSON.stringify({})};`)
  })

  test('accepts undefined values (no filtering done by EnvInjector)', () => {
    const env: Record<string, string | undefined> = {
      NEXT_PUBLIC_DEFINED: 'x',
      NEXT_PUBLIC_UNDEFINED: undefined,
    }

    const { container } = render(<EnvInjector env={env} />)
    const script = container.querySelector('script')
    expect(script).toBeInTheDocument()

    // Note: JSON.stringify omits undefined values by design.
    expect(script?.innerHTML).toBe(`window.env = ${JSON.stringify(env)};`)
  })
})
