import { render, screen, waitFor } from '@testing-library/react'
import { describe, expect, test } from '@jest/globals'
import StoreChecker from '@/components/StoreChecker'
import useStore from '@/stores/global_store'
import '@testing-library/jest-dom'

jest.mock('@/stores/global_store')

describe('StoreChecker', () => {
  test('displays success message when documents are loaded', async () => {
    // Mock loading to be false and fetchDocuments to resolve
    useStore
      .mockReturnValueOnce(false) // for loading state
      .mockReturnValueOnce(() => Promise.resolve()) // for fetchDocuments function

    render(<StoreChecker />)

    await waitFor(() => {
      expect(screen.getByText('Server data loaded')).toBeInTheDocument()
    })
  })
})
