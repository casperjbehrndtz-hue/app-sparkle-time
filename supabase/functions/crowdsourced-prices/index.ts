import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, isValidPostalCode } from "../_shared/cors.ts";

// Hash a postal code with SHA-256 before storing (GDPR data minimisation).
// The first 16 hex chars are sufficient for uniqueness across 10k Danish postal codes.
async function hashPostalCode(postalCode: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(postalCode));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 16);
}

Deno.serve(async (req) => {
  const cors = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: cors });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    // GET: Retrieve aggregated price averages
    if (req.method === "GET") {
      const url = new URL(req.url);
      const category = url.searchParams.get("category");
      const rawPostalCode = url.searchParams.get("postal_code");
      const householdType = url.searchParams.get("household_type");

      let query = supabase.from("price_averages").select("*");

      if (category) query = query.eq("category", category);
      if (rawPostalCode && isValidPostalCode(rawPostalCode)) {
        // Hash before querying so we never store raw codes in logs either
        const hashedCode = await hashPostalCode(rawPostalCode);
        query = query.eq("postal_code", hashedCode);
      }
      if (householdType) query = query.eq("household_type", householdType);

      const { data, error } = await query;
      if (error) throw error;

      return new Response(JSON.stringify({ averages: data }), {
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    // POST: Submit batch of price observations
    if (req.method === "POST") {
      const { observations } = await req.json();

      if (!Array.isArray(observations) || observations.length === 0) {
        return new Response(
          JSON.stringify({ error: "observations array required" }),
          { status: 400, headers: { ...cors, "Content-Type": "application/json" } },
        );
      }

      // Validate, sanitize, and hash postal codes before inserting
      const valid = await Promise.all(
        observations
          .filter(
            (o: any) =>
              o.category &&
              o.household_type &&
              typeof o.amount === "number" &&
              o.amount > 0 &&
              o.amount < 200000,
          )
          .map(async (o: any) => ({
            category: String(o.category).slice(0, 50),
            postal_code: isValidPostalCode(o.postal_code)
              ? await hashPostalCode(String(o.postal_code))
              : null,
            household_type: String(o.household_type).slice(0, 10),
            amount: Math.round(o.amount),
          })),
      );

      if (valid.length === 0) {
        return new Response(
          JSON.stringify({ error: "no valid observations" }),
          { status: 400, headers: { ...cors, "Content-Type": "application/json" } },
        );
      }

      const { error } = await supabase.from("price_observations").insert(valid);
      if (error) throw error;

      return new Response(
        JSON.stringify({ submitted: valid.length }),
        { headers: { ...cors, "Content-Type": "application/json" } },
      );
    }

    return new Response("Method not allowed", { status: 405, headers: cors });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...cors, "Content-Type": "application/json" } },
    );
  }
});
