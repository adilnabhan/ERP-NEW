import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
  console.log("Logging in...");
  const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
    email: 'admin@clinic.com',
    password: 'MALAYALAM'
  });
  
  if (authErr) {
    console.error("Login failed:", authErr.message);
    return;
  }
  
  console.log("Logged in! Fetching rooms...");
  const { data, error } = await supabase.from('rooms').select('*');
  if (error) {
    console.error("Error connecting to Supabase:");
    console.error(error);
  } else {
    console.log("Successfully connected! Found " + data.length + " rooms.");
  }
}

testConnection();
