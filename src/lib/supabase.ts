import { createClient } from '@supabase/supabase-js';

// Configuration with high-priority localStorage support for easy customer integration, falling back to environment variables
const getSupabaseConfig = () => {
  const localUrl = typeof window !== 'undefined' ? localStorage.getItem('custom_supabase_url') : null;
  const localKey = typeof window !== 'undefined' ? localStorage.getItem('custom_supabase_key') : null;

  const url = localUrl || import.meta.env.VITE_SUPABASE_URL || 'https://mhpmwsafqrjgsodnztll.supabase.co';
  const key = localKey || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_q5zax92UyLCrAIs7ZJDODQ_T93URdMc';

  return { url: url.trim(), key: key.trim() };
};

const { url, key } = getSupabaseConfig();

// Initial singleton instance
export const supabase = (url && key) ? createClient(url, key) : null;

// Dynamic getter to always fetch current instance in case keys are changed dynamically
export const getActiveSupabase = () => {
  const { url: activeUrl, key: activeKey } = getSupabaseConfig();
  return (activeUrl && activeKey) ? createClient(activeUrl, activeKey) : null;
};
