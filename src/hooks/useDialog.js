import { useEffect, useRef } from 'react'

// Shared dialog behavior: focus the returned ref on open, Escape closes, the page behind
// stops scrolling, and focus goes back to whatever opened the dialog.
export function useDialog(onClose) {
  const initialFocus = useRef(null)

  useEffect(() => {
    const previouslyFocused = document.activeElement
    initialFocus.current?.focus()
    const onKey = (e) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
      previouslyFocused?.focus?.()
    }
  }, [onClose])

  return initialFocus
}
