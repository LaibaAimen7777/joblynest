import { createClient } from '@supabase/supabase-js';

console.log({
  supabaseUrl: process.env.REACT_APP_SUPABASE_URL,
  supabaseKey: process.env.REACT_APP_SUPABASE_ANON_KEY
});

if (!process.env.REACT_APP_SUPABASE_URL || !process.env.REACT_APP_SUPABASE_ANON_KEY) {
  throw new Error(`
    Missing Supabase credentials! Check that:
    1. Your .env file exists in the project root
    2. Variables are prefixed with REACT_APP_
    3. You've restarted your development server
  `);
}

const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL,
  process.env.REACT_APP_SUPABASE_ANON_KEY
);

export default supabase;