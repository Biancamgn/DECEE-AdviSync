// AdviSync — Supabase Client Configuration
// Include AFTER the Supabase CDN script on every page.

const SUPABASE_URL = 'https://zbbqhhryogeahttzygyu.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpiYnFoaHJ5b2dlYWh0dHp5Z3l1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ5ODUwNzIsImV4cCI6MjA5MDU2MTA3Mn0.YYAMTmh9Ee1ivjt3zAQhnUC2LNWXDbqtks9kqQm-lXw';

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
