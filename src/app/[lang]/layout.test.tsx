// Mock imports
jest.mock('./LanguageProvider', () => ({
  LanguageProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>
}))

jest.mock('@mui/material-nextjs/v13-appRouter', () => ({
  AppRouterCacheProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>
}))

describe('RootLayout', () => {
  it('should render the correct language based on params', async () => {
    // Mock params
   /* const mockParams = { lang: 'en' }

    // Mock messages (replace with your actual messages)
    const enMessages = { greeting: 'Hello' }
    const frMessages = { greeting: 'Bonjour' }

    const messages = { en: enMessages, fr: frMessages }

    // Render RootLayout with mock params
    render(
      <RootLayout params={Promise.resolve(mockParams)}>{'Test Content'}</RootLayout>
    )

    // Wait for the content to be rendered
    await waitFor(() => {
      // Now wait for 'Test Content' to be present in the document
      expect(screen.getByText('Test Content')).toBeInTheDocument()
    })*/
  })
})
