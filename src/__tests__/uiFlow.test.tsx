import '@testing-library/jest-dom/jest-globals'
import { describe, it, expect, jest } from '@jest/globals'
import { render, screen, fireEvent } from '@testing-library/react'
import { GameFlowProvider } from '@/context/GameFlowContext'
import { SoundProvider } from '@/context/SoundContext'
import { RankProvider } from '@/context/RankContext'
import { ModeScreen } from '@/components/screens/ModeScreen'

// 包装组件，提供所有必要的 Context
function renderWithProviders(ui: React.ReactElement) {
  return render(
    <SoundProvider>
      <GameFlowProvider>
        <RankProvider>
          {ui}
        </RankProvider>
      </GameFlowProvider>
    </SoundProvider>
  )
}

describe('新 UI 流程', () => {
  it('人机模式下显示执子选择并在选择后可开始', () => {
    renderWithProviders(<ModeScreen onStart={jest.fn()} />)

    fireEvent.click(screen.getByRole('button', { name: /人机对战/ }))
    expect(screen.getByText('执子选择')).toBeInTheDocument()

    const startBtn = screen.getByRole('button', { name: '开始游戏' })
    expect(startBtn).toBeDisabled()

    fireEvent.click(screen.getByRole('button', { name: /执黑（先手）/ }))
    expect(startBtn).not.toBeDisabled()
  })

  it('PvP 模式可直接开始并导航到对弈页', () => {
    const onStart = jest.fn()
    renderWithProviders(<ModeScreen onStart={onStart} />)

    fireEvent.click(screen.getByRole('button', { name: /玩家对战/ }))
    fireEvent.click(screen.getByRole('button', { name: '开始游戏' }))
    expect(onStart).toHaveBeenCalled()
  })
})
