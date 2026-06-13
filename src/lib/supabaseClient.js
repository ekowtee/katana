import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Guard: createClient() throws at import time when the URL/key are missing,
// which would crash the entire app (blank screen). The launch RSVP form needs
// Supabase, but the panel portal does not — so degrade gracefully instead.
let client = null
if (supabaseUrl && supabaseAnonKey) {
  client = createClient(supabaseUrl, supabaseAnonKey)
} else {
  console.warn('Supabase credentials missing — RSVP form disabled. Check your .env.local file.')
}

export const supabase = client
