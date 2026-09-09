import React from 'react'
import '@testing-library/jest-dom'
import { render } from '@testing-library/react'
import { ChatConfigInjector } from './ChatConfigInjector'
import type { ChatClientConfig } from '@/types/ChatConfig'

describe('ChatConfigInjector', () => {
  test('renders a script that assigns window.__SVP_CHAT_CONFIG__', () => {
    const config: ChatClientConfig = {
      enabled: true,
      welcome: { title: 'Welcome', message: 'Hi!' },
      suggestions: [{ label: 'Pubs', value: 'Show my publications.' }],
    }

    const { container } = render(<ChatConfigInjector config={config} />)

    const script = container.querySelector('script')
    expect(script).toBeInTheDocument()
    expect(script?.innerHTML).toBe(
      `window.__SVP_CHAT_CONFIG__ = ${JSON.stringify(config)};`,
    )
  })

  test('never serialises a system prompt', () => {
    const config: ChatClientConfig = {
      enabled: true,
      welcome: null,
      suggestions: [],
    }

    const { container } = render(<ChatConfigInjector config={config} />)

    expect(container.querySelector('script')?.innerHTML).not.toContain(
      'systemPrompt',
    )
  })
})
