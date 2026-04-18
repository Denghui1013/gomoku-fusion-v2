import '@testing-library/jest-dom'

declare global {
  namespace jest {
    interface Matchers<R> {
      toBeInTheDocument(): R
      toHaveAttribute(attr: string, value?: string): R
      toHaveClass(className: string): R
      toHaveStyle(style: Record<string, string>): R
      toHaveTextContent(text: string | RegExp, options?: { normalizeWhitespace: boolean }): R
      toBeVisible(): R
      toBeDisabled(): R
      toBeEnabled(): R
      toBeEmpty(): R
      toBeEmptyDOMElement(): R
      toBeInvalid(): R
      toBeRequired(): R
      toBeValid(): R
      toContainElement(element: Element | null): R
      toContainHTML(html: string): R
      toHaveAccessibleDescription(description?: string | RegExp): R
      toHaveAccessibleName(name?: string | RegExp): R
      toHaveDisplayValue(value?: string | RegExp | Array<string | RegExp>): R
      toHaveFocus(): R
      toHaveFormValues(values: Record<string, unknown>): R
      toHaveValue(value?: string | RegExp | Array<string | RegExp>): R
      toHaveSelection(selection: { anchorNode: Node | null; anchorOffset: number; focusNode: Node | null; focusOffset: number }): R
    }
  }
}
