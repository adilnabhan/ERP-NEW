import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://fojznanhyshlvnjicftm.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZvanpuYW5oeXNobHZuamljZnRtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ5NzAwNzAsImV4cCI6MjA5MDU0NjA3MH0.N1UxuIyX7MtvmERyp9pxLusFuL-Y50BW46rChYs2bug';

export const supabase = createClient(supabaseUrl, supabaseKey);
