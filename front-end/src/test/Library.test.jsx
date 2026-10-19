import { describe, expect, it } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from '../App.jsx'
import { LIBRARY_KEY } from '../hooks/useLibrary.js'

async function addTitle(user, title, { series = false, addToMyList = true } = {}) {
  await user.click(screen.getByRole('button', { name: '+ Add your own title' }))
  const dialog = screen.getByRole('dialog', { name: 'Add a movie or show' })
  await user.type(within(dialog).getByRole('textbox', { name: 'Title' }), title)
  if (series) await user.click(within(dialog).getByRole('button', { name: 'Series' }))
  if (!addToMyList) await user.click(within(dialog).getByRole('checkbox', { name: 'Also add it to My List' }))
  await user.click(within(dialog).getByRole('button', { name: 'Add title' }))
}

async function createList(user, name) {
  const section = screen.getByRole('region', { name: 'Your lists' })
  await user.type(within(section).getByRole('textbox', { name: 'New list name' }), name)
  await user.click(within(section).getByRole('button', { name: 'Create list' }))
  return section
}

describe('Adding your own titles', () => {
  it('adds a movie to the catalog and to My List', async () => {
    const user = userEvent.setup()
    render(<App />)
    await addTitle(user, 'Interstellar')

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Open Interstellar' }))
    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByText('Movie')).toBeInTheDocument()
    expect(within(dialog).getByText('Added by you')).toBeInTheDocument()
  })

  it('can add a title without putting it on My List', async () => {
    const user = userEvent.setup()
    render(<App />)
    await addTitle(user, 'Severance', { series: true, addToMyList: false })
    expect(screen.queryByRole('button', { name: 'Open Severance' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Add Severance to My List' })).toBeInTheDocument()
  })

  it('needs a title before saving', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: '+ Add your own title' }))
    const dialog = screen.getByRole('dialog', { name: 'Add a movie or show' })
    await user.click(within(dialog).getByRole('button', { name: 'Add title' }))
    expect(within(dialog).getByRole('alert')).toHaveTextContent('Give it a title.')
  })

  it('deleting your title removes it from My List and your lists', async () => {
    const user = userEvent.setup()
    render(<App />)
    await addTitle(user, 'Interstellar')
    await createList(user, 'Space')

    await user.click(screen.getByRole('button', { name: 'Open Interstellar' }))
    let dialog = screen.getByRole('dialog')
    await user.click(within(dialog).getByRole('button', { name: 'Space' }))
    await user.click(within(dialog).getByRole('button', { name: 'Delete this title from Myflix' }))

    expect(screen.queryByRole('button', { name: 'Open Interstellar' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Add Interstellar to My List' })).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Space (0)' })).toBeInTheDocument()
  })
})

describe('Your lists', () => {
  it('creates a list, adds and removes titles, renames and deletes it', async () => {
    const user = userEvent.setup()
    render(<App />)
    const section = await createList(user, 'Comfort shows')
    expect(within(section).getByRole('heading', { name: 'Comfort shows (0)' })).toBeInTheDocument()

    await user.selectOptions(within(section).getByRole('combobox', { name: 'Title to add to Comfort shows' }), 'Brooklyn Nine-Nine')
    await user.click(within(section).getByRole('button', { name: 'Add to list' }))
    expect(within(section).getByRole('heading', { name: 'Comfort shows (1)' })).toBeInTheDocument()

    await user.click(within(section).getByRole('button', { name: 'Remove Brooklyn Nine-Nine from Comfort shows' }))
    expect(within(section).getByRole('heading', { name: 'Comfort shows (0)' })).toBeInTheDocument()

    await user.click(within(section).getByRole('button', { name: 'Rename Comfort shows' }))
    const nameBox = within(section).getByRole('textbox', { name: 'List name' })
    await user.clear(nameBox)
    await user.type(nameBox, 'Cozy')
    await user.click(within(section).getByRole('button', { name: 'Save' }))
    expect(within(section).getByRole('heading', { name: 'Cozy (0)' })).toBeInTheDocument()

    await user.click(within(section).getByRole('button', { name: 'Delete Cozy' }))
    expect(within(section).queryByRole('heading', { name: /Cozy/ })).not.toBeInTheDocument()
  })

  it('blocks a second list with the same name', async () => {
    const user = userEvent.setup()
    render(<App />)
    const section = await createList(user, 'Faves')
    await user.type(within(section).getByRole('textbox', { name: 'New list name' }), 'faves')
    expect(within(section).getByRole('alert')).toHaveTextContent('already have a list')
    expect(within(section).getByRole('button', { name: 'Create list' })).toBeDisabled()
  })

  it('adds a show to a new or existing list from its dialog', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: 'Open Wednesday' }))
    const dialog = screen.getByRole('dialog')
    await user.type(within(dialog).getByRole('textbox', { name: 'New list name' }), 'Spooky')
    await user.click(within(dialog).getByRole('button', { name: 'New list with this title' }))

    const toggle = within(dialog).getByRole('button', { name: 'Spooky' })
    expect(toggle).toHaveAttribute('aria-pressed', 'true')
    await user.keyboard('{Escape}')
    expect(screen.getByRole('list', { name: 'Titles in Spooky' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Open Wednesday' }))
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Spooky' }))
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('list', { name: 'Titles in Spooky' })).not.toBeInTheDocument()
  })

  it('keeps titles and lists across reloads', async () => {
    const user = userEvent.setup()
    const { unmount } = render(<App />)
    await addTitle(user, 'Interstellar')
    await createList(user, 'Space')
    unmount()

    const saved = JSON.parse(localStorage.getItem(LIBRARY_KEY))
    expect(Object.values(saved.customShows).map((s) => s.title)).toEqual(['Interstellar'])
    render(<App />)
    expect(screen.getByRole('button', { name: 'Open Interstellar' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Space (0)' })).toBeInTheDocument()
  })
})
