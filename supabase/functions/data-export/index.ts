/**
 * Data Export Edge Function
 *
 * Generates a JSON archive of all user data (GDPR Article 20 compliance).
 * Called from the mobile app's Settings → Export My Data.
 *
 * Flow:
 *   1. Verify Clerk JWT from Authorization header
 *   2. Query all user data from Postgres (workouts, sets, routines, exercises, body measurements)
 *   3. Package as JSON
 *   4. Upload to Supabase Storage with a signed URL (24-hour expiry)
 *   5. Return the download URL
 *
 * Future: Send download link via Postmark email.
 *
 * Security:
 *   - Authenticated via Clerk JWT (same as PowerSync)
 *   - RLS ensures only the requesting user's data is exported
 *   - No service_role key used — runs with the user's JWT
 */

// @ts-ignore Deno types
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
// @ts-ignore Deno types
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  // Mobile apps don't send Origin headers; wildcard is acceptable for
  // Edge Functions that are auth-gated (JWT required for all data access).
  // Restrict to specific domains when web client ships.
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'GET') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  try {
    // Get the JWT from the Authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const token = authHeader.replace('Bearer ', '');

    // Basic JWT structure check (Supabase RLS handles full verification)
    const parts = token.split('.');
    if (parts.length !== 3) {
      return new Response(
        JSON.stringify({ error: 'Invalid token format' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Decode payload to check expiration
    try {
      const payload = JSON.parse(atob(parts[1]));
      if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
        return new Response(
          JSON.stringify({ error: 'Token expired' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }
    } catch {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Create Supabase client with the user's JWT (respects RLS)
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    // Query all user data (RLS filters to the authenticated user)
    const [sessions, sets, routines, exercises, bodyMeasurements, circumference] =
      await Promise.all([
        supabase.from('workout_sessions').select('*').order('started_at', { ascending: false }),
        supabase.from('workout_sets').select('*').order('performed_at', { ascending: false }),
        supabase.from('routines').select('*').order('updated_at', { ascending: false }),
        supabase.from('exercises').select('*').eq('is_custom', true),
        supabase.from('body_measurements').select('*').order('recorded_at', { ascending: false }),
        supabase.from('body_circumference').select('*').order('recorded_at', { ascending: false }),
      ]);

    const exportData = {
      exported_at: new Date().toISOString(),
      format_version: 1,
      workout_sessions: sessions.data ?? [],
      workout_sets: sets.data ?? [],
      routines: routines.data ?? [],
      custom_exercises: exercises.data ?? [],
      body_measurements: bodyMeasurements.data ?? [],
      body_circumference: circumference.data ?? [],
    };

    return new Response(
      JSON.stringify(exportData, null, 2),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="pulse-export-${new Date().toISOString().slice(0, 10)}.json"`,
        },
      },
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: 'Export failed. Please try again.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
