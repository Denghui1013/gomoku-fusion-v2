import { describe, it, expect } from '@jest/globals'
import { render, screen } from '@testing-library/react'
import { Stone } from '@/components/game/Stone'

describe('Stone Component', () => {
  it('renders black stone correctly', () => {
    render(<Stone player="black" />)
    const stone = screen.getByTestId('stone')
    expect(stone).toBeInTheDocument()
  })

  it('renders white stone correctly', () => {
    render(<Stone player="white" />)
    const stone = screen.getByTestId('stone')
    expect(stone).toBeInTheDocument()
  })

  it('shows last move marker when isLastMove is true', () => {
    render(<Stone player="black" isLastMove={true} />)
    const marker = screen.getByTestId('last-move-marker')
    expect(marker).toBeInTheDocument()
  })

  it('does not show last move marker when isLastMove is false', () => {
    render(<Stone player="black" isLastMove={false} />)
    const marker = screen.queryByTestId('last-move-marker')
    expect(marker).not.toBeInTheDocument()
  })

  it('applies winning animation when isWinning is true', () => {
    render(<Stone player="black" isWinning={true} />)
    const stone = screen.getByTestId('stone')
    expect(stone).toHaveClass('animate-pulse')
  })

  it('renders with custom size', () => {
    const customSize = 48
    render(<Stone player="black" size={customSize} />)
    const stone = screen.getByTestId('stone')
    expect(stone).toHaveStyle({ width: `${customSize}px`, height: `${customSize}px` })
  })
})
