import { describe, expect, it } from 'vitest'
import { authErrorMessage, authFormError, fallbackName, userStorageKey } from '../utils/authUtils.js'

describe('authFormError', () => {
  const ok = { name: 'Maria', email: 'maria@example.com', password: 'secret1' }

  it('accepts a complete form', () => {
    expect(authFormError(ok, 'register')).toBeNull()
    expect(authFormError({ ...ok, name: '' }, 'login')).toBeNull() // Log in has no name field
  })

  it('names the first problem', () => {
    expect(authFormError({ ...ok, name: '  ' }, 'register')).toBe('Enter your name.')
    expect(authFormError({ ...ok, email: 'maria@' }, 'login')).toBe('Enter a valid email address.')
    expect(authFormError({ ...ok, password: '' }, 'login')).toBe('Enter your password.')
    expect(authFormError({ ...ok, password: '12345' }, 'register')).toBe('Password must be at least 6 characters.')
    expect(authFormError({ ...ok, password: '12345' }, 'login')).toBeNull() // old passwords still work
  })
})

describe('authErrorMessage', () => {
  it('turns Supabase error codes into plain messages', () => {
    expect(authErrorMessage({ code: 'invalid_credentials' })).toBe('Wrong email or password.')
    expect(authErrorMessage({ code: 'user_already_exists' })).toBe('That email already has an account. Log in instead.')
    expect(authErrorMessage({ code: 'email_address_invalid' })).toBe("That email address can't be used. Check it for typos.")
    expect(authErrorMessage(new Error('fetch failed'))).toBe('Something went wrong. Check your connection and try again.')
  })
})

describe('fallbackName and userStorageKey', () => {
  it('uses the registered name, else the start of the email', () => {
    expect(fallbackName({ email: 'sam.lee@example.com', user_metadata: { name: 'Sam' } })).toBe('Sam')
    expect(fallbackName({ email: 'sam.lee@example.com', user_metadata: {} })).toBe('sam.lee')
  })

  it('gives each account its own storage key', () => {
    expect(userStorageKey('myflix:my-list', 'u1')).toBe('myflix:my-list:u1')
    expect(userStorageKey('myflix:my-list', null)).toBe('myflix:my-list')
  })
})
