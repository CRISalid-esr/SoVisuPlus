import { render, waitFor } from '@testing-library/react'
import { signIn, useSession } from 'next-auth/react'
import TransientSso from './TransientSso'

const replace = jest.fn()

jest.mock('next-auth/react', () => ({
  signIn: jest.fn(),
  useSession: jest.fn(),
}))
jest.mock('next/navigation', () => ({
  useRouter: () => ({ replace }),
}))

const renderWithStatus = (status: string) => {
  ;(useSession as jest.Mock).mockReturnValue({ status })
  return render(
    <TransientSso idpHint='saml2-xyz' callbackUrl='/fr/dashboard' />,
  )
}

describe('TransientSso', () => {
  it('sends an unauthenticated user to Keycloak with the IdP hint', async () => {
    const { rerender } = renderWithStatus('unauthenticated')
    rerender(<TransientSso idpHint='saml2-xyz' callbackUrl='/fr/dashboard' />)

    await waitFor(() => expect(signIn).toHaveBeenCalledTimes(1))
    expect(signIn).toHaveBeenCalledWith(
      'keycloak',
      { callbackUrl: '/fr/dashboard' },
      { kc_idp_hint: 'saml2-xyz' },
    )
    expect(replace).not.toHaveBeenCalled()
  })

  it('redirects an authenticated user without signing in again', async () => {
    renderWithStatus('authenticated')

    await waitFor(() => expect(replace).toHaveBeenCalledWith('/fr/dashboard'))
    expect(signIn).not.toHaveBeenCalled()
  })

  it('waits while the session is loading', () => {
    renderWithStatus('loading')

    expect(signIn).not.toHaveBeenCalled()
    expect(replace).not.toHaveBeenCalled()
  })
})
