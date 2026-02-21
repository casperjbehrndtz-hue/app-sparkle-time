import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    // GET: Retrieve aggregated price averages
    if (req.method === "GET") {
      const url = new URL(req.url);
      const category = url.searchParams.get("category");
      const postalCode = url.searchParams.get("postal_code");
      const householdType = url.searchParams.get("household_type");

      let query = supabase.from("price_averages").select("*");

      if (category) query = query.eq("category", category);
      if (postalCode) query = query.eq("postal_code", postalCode);
      if (householdType) query = query.eq("household_type", householdType);

      const { data, error } = await query;

      if (error) throw error;

      return new Response(JSON.stringify({ averages: data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // POST: Submit batch of price observations
    if (req.method === "POST") {
      const { observations } = await req.json();

      if (!Array.isArray(observations) || observations.length === 0) {
        return new Response(
          JSON.stringify({ error: "observations array required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Validate and sanitize
      const valid = observations
        .filter(
          (o: any) =>
            o.category &&
            o.household_type &&
            typeof o.amount === "number" &&
            o.amount > 0 &&
            o.amount < 200000
        )
        .map((o: any) => ({
          category: String(o.category).slice(0, 50),
          postal_code: o.postal_code ? String(o.postal_code).slice(0, 10) : null,
          household_type: String(o.household_type).slice(0, 10),
          amount: Math.round(o.amount),
        }));

      if (valid.length === 0) {
        return new Response(
          JSON.stringify({ error: "no valid observations" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { error } = await supabase
        .from("price_observations")
        .insert(valid);

      if (error) throw error;

      return new Response(
        JSON.stringify({ submitted: valid.length }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response("Method not allowed", {
      status: 405,
      headers: corsHeaders,
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
