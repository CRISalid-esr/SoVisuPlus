import { render, screen, waitFor } from '@testing-library/react'
import { describe, expect, test } from '@jest/globals'
import StoreChecker from '@/components/StoreChecker'
import useStore from '@/stores/global_store'
import '@testing-library/jest-dom'

jest.mock('@/stores/global_store')

describe('StoreChecker', () => {
  test('displays success message when publications are loaded', async () => {
    // Mock loading to be false and fetchPublications to resolve
    useStore
      .mockReturnValueOnce(false) // for loading state
      .mockReturnValueOnce(() => Promise.resolve()) // for fetchPublications function

    render(<StoreChecker />)

    await waitFor(() => {
      expect(screen.getByText('Publications loaded')).toBeInTheDocument()
    })
  })
})
