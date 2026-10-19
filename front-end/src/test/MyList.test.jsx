import { describe, expect, it } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from '../App.jsx'
import { STORAGE_KEY } from '../hooks/useMyList.js'

async function openShow(user, title) {
  await user.click(screen.getByRole('button', { name: `Open ${title}` }))
  return screen.getByRole('dialog')
}

describe('My List', () => {
  it('shows the starter list', () => {
    render(<App />)
    const grid = screen.getByRole('list', { name: 'Shows in My List' })
    expect(within(grid).getAllByRole('listitem')).toHaveLength(5)
    expect(screen.getByRole('heading', { name: 'My List' })).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Saved on this device')
  })

  it('rates a show and reflects it on the card and stats', async () => {
    const user = userEvent.setup()
    render(<App />)
    const dialog = await openShow(user, 'Wednesday')
    await user.click(within(dialog).getByRole('button', { name: '4 stars' }))
    expect(within(dialog).getByText('4 / 5')).toBeInTheDocument()

    await user.click(within(dialog).getByRole('button', { name: 'Close' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Rated 4 out of 5')).toBeInTheDocument()
    expect(within(screen.getByLabelText('List stats')).getByText('4')).toBeInTheDocument()
  })

  it('posts, edits and deletes a comment', async () => {
    const user = userEvent.setup()
    render(<App />)
    const dialog = await openShow(user, 'Stranger Things')
    const post = within(dialog).getByRole('button', { name: 'Post' })
    expect(post).toBeDisabled()

    await user.type(within(dialog).getByRole('textbox', { name: 'Write a comment' }), 'Season 4 was wild')
    await user.click(post)
    expect(within(dialog).getByText('Season 4 was wild')).toBeInTheDocument()
    expect(within(dialog).getByRole('textbox', { name: 'Write a comment' })).toHaveValue('')

    await user.click(within(dialog).getByRole('button', { name: 'Edit' }))
    const editBox = within(dialog).getByRole('textbox', { name: 'Edit comment' })
    await user.clear(editBox)
    await user.type(editBox, 'Season 4 was incredible')
    await user.click(within(dialog).getByRole('button', { name: 'Save' }))
    expect(within(dialog).getByText('Season 4 was incredible')).toBeInTheDocument()
    expect(within(dialog).getByText(/edited/)).toBeInTheDocument()

    await user.click(within(dialog).getByRole('button', { name: 'Delete' }))
    expect(within(dialog).queryByText('Season 4 was incredible')).not.toBeInTheDocument()
  })

  it('hides spoiler comments until revealed', async () => {
    const user = userEvent.setup()
    render(<App />)
    const dialog = await openShow(user, 'Stranger Things')
    await user.type(within(dialog).getByRole('textbox', { name: 'Write a comment' }), 'Eleven survives')
    await user.click(within(dialog).getByRole('checkbox', { name: 'Contains spoilers' }))
    await user.click(within(dialog).getByRole('button', { name: 'Post' }))

    expect(within(dialog).queryByText('Eleven survives')).not.toBeInTheDocument()
    await user.click(within(dialog).getByRole('button', { name: /click to reveal/ }))
    expect(within(dialog).getByText('Eleven survives')).toBeInTheDocument()
  })

  it('filters by status after changing it', async () => {
    const user = userEvent.setup()
    render(<App />)
    const dialog = await openShow(user, 'Wednesday')
    await user.click(within(dialog).getByRole('button', { name: 'Finished' }))
    await user.keyboard('{Escape}')

    await user.click(screen.getByRole('button', { name: /^Finished/ }))
    const grid = screen.getByRole('list', { name: 'Shows in My List' })
    expect(within(grid).getAllByRole('listitem')).toHaveLength(1)
    expect(within(grid).getByRole('button', { name: 'Open Wednesday' })).toBeInTheDocument()
  })

  it('adds and removes shows', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: 'Add Arcane to My List' }))
    expect(screen.getByRole('button', { name: 'Open Arcane' })).toBeInTheDocument()

    const dialog = await openShow(user, 'Arcane')
    await user.click(within(dialog).getByRole('button', { name: 'Remove from My List' }))
    expect(screen.queryByRole('button', { name: 'Open Arcane' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Add Arcane to My List' })).toBeInTheDocument()
  })

  it('persists ratings and comments across reloads', async () => {
    const user = userEvent.setup()
    const { unmount } = render(<App />)
    const dialog = await openShow(user, 'Wednesday')
    await user.click(within(dialog).getByRole('button', { name: '5 stars' }))
    await user.type(within(dialog).getByRole('textbox', { name: 'Write a comment' }), 'Iconic')
    await user.click(within(dialog).getByRole('button', { name: 'Post' }))
    unmount()

    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).wednesday.rating).toBe(5)
    render(<App />)
    expect(screen.getByLabelText('Rated 5 out of 5')).toBeInTheDocument()
    expect(screen.getByLabelText('1 comment')).toBeInTheDocument()
  })
})
