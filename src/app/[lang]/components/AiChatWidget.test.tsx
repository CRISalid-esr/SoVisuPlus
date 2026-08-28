import { act, render, screen } from '@testing-library/react'
import { i18n } from '@lingui/core'
import { I18nProvider } from '@lingui/react'
import { getRuntimeChatConfig } from '@/utils/runtimeChatConfig'
import type { ChatClientConfig } from '@/types/ChatConfig'
import AiChatWidget from './AiChatWidget'

jest.mock('@/utils/runtimeChatConfig', () => ({
  getRuntimeChatConfig: jest.fn(),
}))

const mockGetRuntimeChatConfig = getRuntimeChatConfig as jest.Mock

const disabledConfig: ChatClientConfig = {
  enabled: false,
  welcome: null,
  suggestions: [],
}

const enabledConfig: ChatClientConfig = {
  enabled: true,
  welcome: { title: 'Welcome', message: 'Hi there!' },
  suggestions: [{ label: 'My publications', value: 'Show my publications.' }],
}

const renderWidget = () =>
  render(
    <I18nProvider i18n={i18n}>
      <AiChatWidget />
    </I18nProvider>,
  )

// The Fab that opens the drawer carries `aria-label={t`ai_chat_open_label`}`;
// with no catalog loaded Lingui echoes the message id, so that is its
// accessible name here.
const openButton = () =>
  screen.queryByRole('button', { name: 'ai_chat_open_label' })

describe('AiChatWidget', () => {
  beforeEach(() => {
    act(() => {
      i18n.activate('en')
    })
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('does not render when the chat is not enabled', () => {
    mockGetRuntimeChatConfig.mockReturnValue(disabledConfig)

    renderWidget()

    expect(openButton()).not.toBeInTheDocument()
  })

  it('does not render when enabled is false even if welcome/suggestions exist', () => {
    mockGetRuntimeChatConfig.mockReturnValue({
      ...enabledConfig,
      enabled: false,
    })

    renderWidget()

    expect(openButton()).not.toBeInTheDocument()
  })

  it('renders the chat launcher when the chat is enabled', () => {
    mockGetRuntimeChatConfig.mockReturnValue(enabledConfig)

    renderWidget()

    expect(openButton()).toBeInTheDocument()
  })
})
