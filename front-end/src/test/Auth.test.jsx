import { describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from '../App.jsx'
import { STORAGE_KEY } from '../hooks/useMyList.js'

// Stand-in for supabase-js auth: email + password accounts kept in memory. Like the real one,
// onAuthStateChange first reports the saved session, then every log in / log out.
function fakeSupabase({ accounts = {}, loggedInAs = null } = {}) {
  const sessionFor = (email) => ({ user: { id: `id-${email}`, email, user_metadata: { name: accounts[email].name } } })
  const failure = (code) => ({ data: { user: null, session: null }, error: Object.assign(new Error(code), { code }) })
  let current = loggedInAs && sessionFor(loggedInAs)
  const listeners = new Set()
  const emit = (event) => listeners.forEach((listener) => listener(event, current))

  return {
    auth: {
      onAuthStateChange(listener) {
        listeners.add(listener)
        queueMicrotask(() => listener('INITIAL_SESSION', current))
        return { data: { subscription: { unsubscribe: () => listeners.delete(listener) } } }
      },
      signUp: vi.fn(async ({ email, password, options }) => {
        if (accounts[email]) return failure('user_already_exists')
        accounts[email] = { password, name: options.data.name }
        current = sessionFor(email)
        emit('SIGNED_IN')
        return { data: { user: current.user, session: current }, error: null }
      }),
      signInWithPassword: vi.fn(async ({ email, password }) => {
        if (accounts[email]?.password !== password) return failure('invalid_credentials')
        current = sessionFor(email)
        emit('SIGNED_IN')
        return { data: { user: current.user, session: current }, error: null }
      }),
      signOut: vi.fn(async () => {
        current = null
        emit('SIGNED_OUT')
        return { error: null }
      }),
    },
    // profiles: like RLS, only ever returns the logged-in user's own row.
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({
            data: current && { display_name: accounts[current.user.email].name, avatar_color: '#e50914' },
            error: null,
          }),
        }),
      }),
    }),
  }
}

const maria = { 'maria@test.dev': { password: 'secret1', name: 'Maria' } }

async function logIn(user, email, password) {
  await user.type(screen.getByLabelText('Email'), email)
  await user.type(screen.getByLabelText('Password'), password)
  await user.click(screen.getByRole('button', { name: 'Log in' }))
}

describe('Accounts', () => {
  it('asks a visitor to log in before showing anything', async () => {
    render(<App authClient={fakeSupabase()} />)
    expect(await screen.findByRole('heading', { name: 'Log in' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'My List' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Log out' })).not.toBeInTheDocument()
  })

  it('registers a new account and lands on an empty My List with their name', async () => {
    const user = userEvent.setup()
    const client = fakeSupabase()
    render(<App authClient={client} />)
    await user.click(await screen.findByRole('button', { name: 'Create an account' }))
    await user.type(screen.getByLabelText('Name'), 'Maria')
    await user.type(screen.getByLabelText('Email'), 'maria@test.dev')
    await user.type(screen.getByLabelText('Password'), 'secret1')
    await user.click(screen.getByRole('button', { name: 'Create account' }))

    expect(await screen.findByRole('heading', { name: 'My List' })).toBeInTheDocument()
    expect(client.auth.signUp).toHaveBeenCalledWith({
      email: 'maria@test.dev',
      password: 'secret1',
      options: { data: { name: 'Maria' } },
    })
    expect(within(screen.getByRole('banner')).getByText('Maria')).toBeInTheDocument()
    expect(screen.getByText('Your list is empty. Add something from the row below.')).toBeInTheDocument()
  })

  it('checks the form and explains an email that already has an account', async () => {
    const user = userEvent.setup()
    const client = fakeSupabase({ accounts: { ...maria } })
    render(<App authClient={client} />)
    await user.click(await screen.findByRole('button', { name: 'Create an account' }))

    await user.click(screen.getByRole('button', { name: 'Create account' }))
    expect(screen.getByRole('alert')).toHaveTextContent('Enter your name.')

    await user.type(screen.getByLabelText('Name'), 'Maria')
    await user.type(screen.getByLabelText('Email'), 'maria@test.dev')
    await user.type(screen.getByLabelText('Password'), '123')
    await user.click(screen.getByRole('button', { name: 'Create account' }))
    expect(screen.getByRole('alert')).toHaveTextContent('Password must be at least 6 characters.')
    expect(client.auth.signUp).not.toHaveBeenCalled()

    await user.type(screen.getByLabelText('Password'), '456')
    await user.click(screen.getByRole('button', { name: 'Create account' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('That email already has an account. Log in instead.')
  })

  it('logs in, and a wrong password never says which part was wrong', async () => {
    const user = userEvent.setup()
    render(<App authClient={fakeSupabase({ accounts: { ...maria } })} />)
    await screen.findByRole('heading', { name: 'Log in' })

    await logIn(user, 'maria@test.dev', 'wrong-pass')
    expect(await screen.findByRole('alert')).toHaveTextContent('Wrong email or password.')
    expect(screen.getByLabelText('Password')).toHaveValue('') // cleared for the next try

    await user.type(screen.getByLabelText('Password'), 'secret1')
    await user.click(screen.getByRole('button', { name: 'Log in' }))
    expect(await screen.findByRole('heading', { name: 'My List' })).toBeInTheDocument()
  })

  it('stays logged in after a refresh', async () => {
    render(<App authClient={fakeSupabase({ accounts: { ...maria }, loggedInAs: 'maria@test.dev' })} />)
    expect(await screen.findByRole('heading', { name: 'My List' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Log in' })).not.toBeInTheDocument()
    expect(within(screen.getByRole('banner')).getByText('Maria')).toBeInTheDocument()
  })

  it("logs out back to Log in and removes this browser's copy of the list", async () => {
    const user = userEvent.setup()
    const client = fakeSupabase({ accounts: { ...maria }, loggedInAs: 'maria@test.dev' })
    render(<App authClient={client} />)
    await user.click(await screen.findByRole('button', { name: 'Add Arcane to My List' }))
    const savedKey = `${STORAGE_KEY}:id-maria@test.dev`
    expect(localStorage.getItem(savedKey)).toContain('arcane')

    await user.click(screen.getByRole('button', { name: 'Log out' }))
    expect(await screen.findByRole('heading', { name: 'Log in' })).toBeInTheDocument()
    expect(client.auth.signOut).toHaveBeenCalled()
    expect(localStorage.getItem(savedKey)).toBeNull()
  })

  it("never shows one account's list to the next person on the same computer", async () => {
    const user = userEvent.setup()
    const accounts = { ...maria, 'sam@test.dev': { password: 'secret2', name: 'Sam' } }
    render(<App authClient={fakeSupabase({ accounts, loggedInAs: 'maria@test.dev' })} />)
    await user.click(await screen.findByRole('button', { name: 'Add Arcane to My List' }))
    await user.click(screen.getByRole('button', { name: 'Log out' }))

    await screen.findByRole('heading', { name: 'Log in' })
    await logIn(user, 'sam@test.dev', 'secret2')
    expect(await screen.findByRole('heading', { name: 'My List' })).toBeInTheDocument()
    expect(within(screen.getByRole('banner')).getByText('Sam')).toBeInTheDocument()
    expect(screen.getByText('Your list is empty. Add something from the row below.')).toBeInTheDocument()
  })
})
