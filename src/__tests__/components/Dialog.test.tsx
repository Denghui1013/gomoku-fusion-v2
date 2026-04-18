import { describe, it, expect } from '@jest/globals'
import { render, screen, fireEvent } from '@testing-library/react'
import { Dialog } from '@/components/ui/Dialog'

describe('Dialog Component', () => {
  const mockOnOpenChange = jest.fn()

  beforeEach(() => {
    mockOnOpenChange.mockClear()
  })

  it('renders when open is true', () => {
    render(
      <Dialog
        open={true}
        onOpenChange={mockOnOpenChange}
        title="Test Dialog"
      >
        <div>Dialog Content</div>
      </Dialog>
    )

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('Test Dialog')).toBeInTheDocument()
    expect(screen.getByText('Dialog Content')).toBeInTheDocument()
  })

  it('does not render when open is false', () => {
    render(
      <Dialog
        open={false}
        onOpenChange={mockOnOpenChange}
        title="Test Dialog"
      >
        <div>Dialog Content</div>
      </Dialog>
    )

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('calls onOpenChange when close button is clicked', () => {
    render(
      <Dialog
        open={true}
        onOpenChange={mockOnOpenChange}
        title="Test Dialog"
      >
        <div>Dialog Content</div>
      </Dialog>
    )

    const closeButton = screen.getByLabelText('关闭对话框')
    fireEvent.click(closeButton)

    expect(mockOnOpenChange).toHaveBeenCalledWith(false)
  })

  it('calls onOpenChange when backdrop is clicked', () => {
    render(
      <Dialog
        open={true}
        onOpenChange={mockOnOpenChange}
        title="Test Dialog"
      >
        <div>Dialog Content</div>
      </Dialog>
    )

    const backdrop = screen.getByLabelText('关闭对话框').parentElement?.parentElement?.parentElement?.previousSibling
    if (backdrop) {
      fireEvent.click(backdrop)
      expect(mockOnOpenChange).toHaveBeenCalledWith(false)
    }
  })

  it('renders description when provided', () => {
    render(
      <Dialog
        open={true}
        onOpenChange={mockOnOpenChange}
        title="Test Dialog"
        description="This is a description"
      >
        <div>Dialog Content</div>
      </Dialog>
    )

    expect(screen.getByText('This is a description')).toBeInTheDocument()
  })

  it('has correct ARIA attributes', () => {
    render(
      <Dialog
        open={true}
        onOpenChange={mockOnOpenChange}
        title="Test Dialog"
      >
        <div>Dialog Content</div>
      </Dialog>
    )

    const dialog = screen.getByRole('dialog')
    const title = screen.getByRole('heading', { name: 'Test Dialog' })
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(dialog).toHaveAttribute('aria-labelledby', title.id)
  })
})
