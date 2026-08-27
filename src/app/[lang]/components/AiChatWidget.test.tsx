import { act, render, screen } from '@testing-library/react'
import { i18n } from '@lingui/core'
import { I18nProvider } from '@lingui/react'
import { getRuntimeEnv } from '@/utils/runtimeEnv'
import AiChatWidget from './AiChatWidget'

jest.mock('@/utils/runtimeEnv', () => ({
  getRuntimeEnv: jest.fn(),
}))

const mockGetRuntimeEnv = getRuntimeEnv as jest.Mock

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

  it('does not render when the agents API URL is not configured', () => {
    mockGetRuntimeEnv.mockReturnValue({})

    renderWidget()

    expect(openButton()).not.toBeInTheDocument()
  })

  it('does not render when the agents API URL is an empty string', () => {
    mockGetRuntimeEnv.mockReturnValue({
      NEXT_PUBLIC_CRISALID_AGENTS_API_URL: '',
    })

    renderWidget()

    expect(openButton()).not.toBeInTheDocument()
  })

  it('renders the chat launcher when the agents API URL is configured', () => {
    mockGetRuntimeEnv.mockReturnValue({
      NEXT_PUBLIC_CRISALID_AGENTS_API_URL: 'http://localhost:9100/chat',
    })

    renderWidget()

    expect(openButton()).toBeInTheDocument()
  })
})
