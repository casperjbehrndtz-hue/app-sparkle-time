import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

// Anonymous session ID — persists for the browser session
function getSessionId(): string {
  let id = sessionStorage.getItem("kassen_sid");
  if (!id) {
    id = Math.random().toString(36).slice(2) + Date.now().toString(36);
    sessionStorage.setItem("kassen_sid", id);
  }
  return id;
}

export type PartnerEvent =
  | "onboarding_start"
  | "onboarding_complete"
  | "dashboard_view"
  | "ai_chat_open"
  | "ai_message_sent"
  | "report_generated";

export function usePartnerTracking(brandKey: string) {
  const track = useCallback(
    (event: PartnerEvent, metadata: Record<string, unknown> = {}) => {
      if (!brandKey || brandKey === "kassen") return; // only track B2B partners
      supabase.from("partner_events").insert({
        brand_key: brandKey,
        event_type: event,
        session_id: getSessionId(),
        metadata,
      }).then(); // fire and forget
    },
    [brandKey]
  );

  return { track };
}
