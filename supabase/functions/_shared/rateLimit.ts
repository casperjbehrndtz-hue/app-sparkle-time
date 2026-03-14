import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const WINDOW_MS = 60 * 60 * 1000; // 1 hour

export async function checkRateLimit(
  functionName: string,
  ip: string,
  maxRequests = 20
): Promise<boolean> {
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const id = `${functionName}:${ip}`;
    const windowCutoff = new Date(Date.now() - WINDOW_MS).toISOString();

    const { data } = await supabase
      .from("api_rate_limits")
      .select("count, window_start")
      .eq("id", id)
      .single();

    if (!data || data.window_start < windowCutoff) {
      // New window — reset
      await supabase.from("api_rate_limits").upsert({ id, count: 1, window_start: new Date().toISOString() });
      return true;
    }

    if (data.count >= maxRequests) return false;

    await supabase.from("api_rate_limits").update({ count: data.count + 1 }).eq("id", id);
    return true;
  } catch {
    // Fail closed — reject request if rate limit check fails
    return false;
  }
}
