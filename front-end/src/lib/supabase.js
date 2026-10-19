import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

// null when Supabase isn't configured (or under Vitest) — the app then runs on localStorage only.
export const supabase = url && key && import.meta.env.MODE !== 'test' ? createClient(url, key) : null
