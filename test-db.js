const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://zbbqhhryogeahttzygyu.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpiYnFoaHJ5b2dlYWh0dHp5Z3l1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ5ODUwNzIsImV4cCI6MjA5MDU2MTA3Mn0.YYAMTmh9Ee1ivjt3zAQhnUC2LNWXDbqtks9kqQm-lXw';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testConnection() {
    console.log('🔄 Testing Supabase connection...');

    try {
        // Test courses table access
        console.log('📚 Testing courses table...');
        const { data: courses, error } = await supabase
            .from('courses')
            .select('*')
            .limit(5);

        if (error) {
            console.error('❌ Error accessing courses table:', error.message);
            console.error('Error details:', error);
            return;
        }

        console.log('✅ Courses table accessible!');
        console.log(`📊 Found ${courses.length} courses`);
        if (courses.length > 0) {
            console.log('First course:', courses[0]);
        }

        // Test auth status
        console.log('🔐 Testing auth status...');
        const { data: { session }, error: authError } = await supabase.auth.getSession();

        if (authError) {
            console.error('❌ Auth error:', authError.message);
        } else {
            console.log(`🔐 Auth status: ${session ? 'Logged in' : 'Not logged in'}`);
        }

    } catch (err) {
        console.error('❌ Unexpected error:', err);
    }
}

testConnection();