/**
 * File:        supabase-config.js
 * Description: Initializes the global Supabase client used across all pages. Exposes supabaseClient for auth and database calls.
 * Author:      Renjovil Joseph V. Lascano & Erin M. Quiazon 
 * Date:        2026-04-02
 */

const supabaseClient = supabase.createClient(
    'https://zbbqhhryogeahttzygyu.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpiYnFoaHJ5b2dlYWh0dHp5Z3l1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ5ODUwNzIsImV4cCI6MjA5MDU2MTA3Mn0.YYAMTmh9Ee1ivjt3zAQhnUC2LNWXDbqtks9kqQm-lXw'
);