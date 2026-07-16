import { createClient } from "@supabase/supabase-js";
 
const SUPABASE_URL = "https://tccnsuugbvnhdzqgvpip.supabase.co";
 
// Chave PUBLISHABLE/ANON — feita pra rodar no navegador. Ela respeita o RLS
// que já configuramos (leitura pública de questões, respostas privadas por
// usuário), então é segura de deixar aqui. NUNCA coloque a service_role key
// neste arquivo — ele roda no navegador de quem visita o site.
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_8xSB81NVnl8L_RZl0w06oQ_PknB4JBH";
 
export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
 
