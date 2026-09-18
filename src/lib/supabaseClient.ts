import { createClient } from '@supabase/supabase-js';

const env = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env : (typeof process !== 'undefined' ? process.env : {}) as any;
const supabaseUrl = (env.VITE_SUPABASE_URL || '').replace(/\s/g, '');
const supabaseAnonKey = (env.VITE_SUPABASE_ANON_KEY || '').replace(/\s/g, '');

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("Mancano le variabili d'ambiente di Supabase!");
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co', 
  supabaseAnonKey || 'placeholder_key'
);
