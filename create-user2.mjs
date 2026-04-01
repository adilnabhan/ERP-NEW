import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

async function createUser() {
  const { data, error } = await supabase.auth.signUp({
    email: 'admin@clinic.com',
    password: 'MALAYALAM',
  })
  
  if (error) {
    console.error('Sign up error:', error.message)
  } else {
    console.log('User created:', data.user?.id)
  }
}
createUser()
