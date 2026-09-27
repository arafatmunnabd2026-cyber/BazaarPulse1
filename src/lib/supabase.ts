import { createClient } from '@supabase/supabase-js';

// Configuration with provided values as fallbacks
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://mhpmwsafqrjgsodnztll.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_q5zax92UyLCrAIs7ZJDODQ_T93URdMc';

// Only initialize if keys are present
export const supabase = (supabaseUrl && supabaseAnonKey) 
  ? createClient(supabaseUrl, supabaseAnonKey) 
  : null;
