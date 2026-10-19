// Pure helpers for the Log in / Register forms. No Supabase calls here (those live in lib/auth.js).

export const PASSWORD_MIN = 6 // Supabase's default minimum

export const EMPTY_AUTH_FORM = { name: '', email: '', password: '' }

// First problem with the form, or null when it can be sent. mode: 'login' | 'register'
export function authFormError(form, mode) {
  if (mode === 'register' && !form.name.trim()) return 'Enter your name.'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) return 'Enter a valid email address.'
  if (!form.password) return 'Enter your password.'
  if (mode === 'register' && form.password.length < PASSWORD_MIN) {
    return `Password must be at least ${PASSWORD_MIN} characters.`
  }
  return null
}

// Turns a Supabase Auth error into a message for the user. Never says whether the email or the
// password was wrong, so nobody can use the form to find out who has an account.
export function authErrorMessage(error) {
  switch (error?.code) {
    case 'invalid_credentials':
      return 'Wrong email or password.'
    case 'user_already_exists':
    case 'email_exists':
      return 'That email already has an account. Log in instead.'
    case 'email_address_invalid':
      return "That email address can't be used. Check it for typos."
    case 'weak_password':
      return `Password must be at least ${PASSWORD_MIN} characters.`
    case 'email_not_confirmed':
      return 'Confirm your email first: check your inbox for the link, then log in.'
    case 'over_request_rate_limit':
    case 'over_email_send_rate_limit':
      return 'Too many tries. Wait a minute and try again.'
    default:
      return 'Something went wrong. Check your connection and try again.'
  }
}

// What to call the user until their profile loads: the name they registered with, else the
// part of their email before the @ (the same rule the database trigger uses).
export function fallbackName(user) {
  return user?.user_metadata?.name || user?.email?.split('@')[0] || ''
}

// Each account keeps its own offline copy, so two people on one computer never see each other's data.
export function userStorageKey(baseKey, userId) {
  return userId ? `${baseKey}:${userId}` : baseKey
}
