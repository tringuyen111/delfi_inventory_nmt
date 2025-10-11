import { createClient } from '@supabase/supabase-js';

// IMPORTANT: Replace with your actual Supabase URL and Anon Key.
// It is highly recommended to use environment variables for this in a real project.
const supabaseUrl = "https://lkubvwreysaclioxxelb.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxrdWJ2d3JleXNhY2xpb3h4ZWxiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk5NTU0MTksImV4cCI6MjA3NTUzMTQxOX0.9sGcLGe9aTn1B9Aegi2OdbrmeDI1Ruun9clEVYTlzow";

if (supabaseUrl.includes('your-project-id')) {
    // This alert is for development purposes to remind the user to configure Supabase.
    // In a production environment, you would have a more robust configuration check.
    alert("Supabase is not configured. Please update lib/supabaseClient.tsx with your project's URL and Public Anon Key.");
}

export const supabase = createClient(supabaseUrl, supabaseKey);
