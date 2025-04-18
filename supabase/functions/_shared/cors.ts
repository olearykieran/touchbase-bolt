// supabase/functions/_shared/cors.ts
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // Allow requests from any origin (adjust if needed for security)
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};
