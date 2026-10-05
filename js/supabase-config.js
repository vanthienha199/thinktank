/**
 * ThinkTank GWAP - Supabase Configuration
 *
 * SETUP INSTRUCTIONS:
 * 1. Create a Supabase project at https://supabase.com
 * 2. Run the migrations in supabase/migrations/ via SQL Editor
 * 3. Run the seed in supabase/seed/ via SQL Editor
 * 4. Copy your project URL and anon key from Settings > API
 * 5. Update the values below
 */

// Supabase project credentials
const SUPABASE_URL = 'YOUR_SUPABASE_URL';
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';

// Initialize Supabase client (loaded via CDN in HTML)
// Note: Using 'supabaseClient' to avoid conflict with SDK's global 'supabase'
let supabaseClient = null;

function initSupabase() {
    if (typeof window.supabase !== 'undefined' && window.supabase.createClient) {
        supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        console.log('Supabase initialized');
        return true;
    }
    console.warn('Supabase SDK not loaded');
    return false;
}

// Check if Supabase is configured
function isSupabaseConfigured() {
    return SUPABASE_URL !== 'YOUR_SUPABASE_URL' &&
           SUPABASE_ANON_KEY !== 'YOUR_SUPABASE_ANON_KEY';
}

// Export for use in other modules
window.ThinkTankConfig = {
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    initSupabase,
    isSupabaseConfigured,
    getClient: () => supabaseClient
};
