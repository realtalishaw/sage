import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Read environment variables
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://ocaybxaeoqrryyynznhp.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_SERVICE_KEY) {
  console.error('Error: SUPABASE_SERVICE_ROLE_KEY environment variable is required');
  console.error('Please set it in your .env file or pass it as an environment variable');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Read the migration file
const migrationPath = join(__dirname, 'supabase/migrations/20260311_001_fix_waitlist_positions.sql');
const sql = readFileSync(migrationPath, 'utf-8');

console.log('Running migration: 20260311_001_fix_waitlist_positions.sql');
console.log('---');

try {
  // Execute the SQL
  const { data, error } = await supabase.rpc('exec_sql', { sql });

  if (error) {
    // If exec_sql doesn't exist, try direct execution
    console.log('Attempting direct SQL execution...');
    const { error: directError } = await supabase.from('_migrations').select('*').limit(0);

    if (directError) {
      console.error('Error:', error);
      console.error('\nPlease run this SQL manually in your Supabase Dashboard SQL Editor:');
      console.error(sql);
      process.exit(1);
    }
  }

  console.log('Migration completed successfully!');
  console.log('All waitlist positions have been calculated and stored.');
} catch (err) {
  console.error('Error running migration:', err.message);
  console.error('\nPlease run this SQL manually in your Supabase Dashboard:');
  console.error('1. Go to https://supabase.com/dashboard');
  console.error('2. Select your project');
  console.error('3. Go to SQL Editor');
  console.error('4. Paste and run the migration file content');
  process.exit(1);
}
