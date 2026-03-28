// Supabase configuratie
// Vul hier jouw gegevens in uit Supabase → Project Settings → Data API

const SUPABASE_URL  = 'https://gjquwqepisbpphgnzlcs.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdqcXV3cWVwaXNicHBoZ256bGNzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2NzU3OTAsImV4cCI6MjA5MDI1MTc5MH0.NFcWbQY_ES4SotPW2cNGFmJl4vpI0m-ejDPPlHj83Gs';

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON);
