import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://exciqetztunqgxbwwodo.supabase.co';
const SUPABASE_ANON_KEY = 'SEU_ANON_KEY'; // substitua pela sua chave anon

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
