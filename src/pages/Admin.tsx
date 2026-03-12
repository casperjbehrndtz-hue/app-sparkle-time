import { useState, useEffect } from "react";
import { Link, Navigate } from "react-router-dom";
import { ArrowLeft, CheckCircle, XCircle, Loader2, Eye, EyeOff, Clock, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { usePageMeta } from "@/hooks/usePageMeta";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
// Admin emails — set VITE_ADMIN_EMAILS in .env (comma-separated)
const ADMIN_EMAILS = (import.meta.env.VITE_ADMIN_EMAILS as string ?? "")
  .split(",").map((e: string) => e.trim().toLowerCase()).filter(Boolean);

type Draft = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  read_time: string;
  content: string;
  keywords: string[];
  status: "pending" | "approved" | "rejected";
  created_at: string;
};

function renderMarkdown(content: string) {
  return content.split("\n").map((line, i) => {
    if (line.startsWith("## ")) return <h2 key={i} className="font-bold text-lg mt-6 mb-2">{line.slice(3)}</h2>;
    if (line.startsWith("### ")) return <h3 key={i} className="font-semibold text-base mt-4 mb-1">{line.slice(4)}</h3>;
    if (line.startsWith("- ")) return <li key={i} className="ml-5 list-disc text-sm text-muted-foreground">{line.slice(2)}</li>;
    if (line.startsWith("| ") && line.includes("|")) {
      const cells = line.split("|").filter(Boolean).map(c => c.trim());
      return <tr key={i}>{cells.map((c, j) => <td key={j} className="border border-border px-2 py-1 text-sm">{c.replace(/\*\*/g, "")}</td>)}</tr>;
    }
    if (line.trim() === "") return <br key={i} />;
    const parts = line.split(/\*\*(.*?)\*\*/g);
    if (parts.length > 1) return <p key={i} className="text-sm leading-relaxed my-1">{parts.map((p, j) => j % 2 === 1 ? <strong key={j}>{p}</strong> : p)}</p>;
    return <p key={i} className="text-sm leading-relaxed my-1">{line}</p>;
  });
}

export default function Admin() {
  usePageMeta("Admin — Kassen", "");

  const [user, setUser] = useState<{ email?: string } | null | undefined>(undefined);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: "ok" | "err" } | null>(null);

  // ─── Check auth ───────────────────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
  }, []);

  const isAdmin = user !== undefined && user !== null && ADMIN_EMAILS.includes(user.email?.toLowerCase() ?? "");

  // ─── Fetch drafts ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isAdmin) return;
    fetchDrafts();
  }, [isAdmin]);

  async function fetchDrafts() {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;

    const res = await fetch(`${SUPABASE_URL}/functions/v1/get-drafts`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const json = await res.json();
    setDrafts(json.drafts ?? []);
    setLoading(false);
  }

  async function handleAction(draftId: string, action: "approve" | "reject") {
    setActionLoading(draftId + action);
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;

    const res = await fetch(`${SUPABASE_URL}/functions/v1/publish-article`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ draft_id: draftId, action }),
    });

    const json = await res.json();
    setActionLoading(null);

    if (json.success) {
      setToast({ msg: action === "approve" ? "Artikel publiceret!" : "Udkast afvist", type: "ok" });
      setDrafts(prev => prev.filter(d => d.id !== draftId));
      setPreviewId(null);
    } else {
      setToast({ msg: json.error ?? "Fejl", type: "err" });
    }

    setTimeout(() => setToast(null), 3000);
  }

  // ─── Auth loading ─────────────────────────────────────────────────────────
  if (user === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // ─── Not admin ────────────────────────────────────────────────────────────
  if (!isAdmin) return <Navigate to="/" replace />;

  const previewing = previewId ? drafts.find(d => d.id === previewId) : null;

  return (
    <div className="min-h-screen bg-background">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl text-sm font-medium shadow-lg ${toast.type === "ok" ? "bg-green-500 text-white" : "bg-red-500 text-white"}`}>
          {toast.msg}
        </div>
      )}

      <header className="border-b border-border bg-background sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" /> Kassen
          </Link>
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            <h1 className="font-display font-bold text-base">SEO Indholdskø</h1>
          </div>
          <span className="text-xs text-muted-foreground">{user?.email}</span>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        {/* Stats bar */}
        <div className="flex items-center gap-4 mb-6">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="w-4 h-4" />
            <span><strong className="text-foreground">{drafts.length}</strong> udkast afventer godkendelse</span>
          </div>
          <button
            onClick={fetchDrafts}
            className="text-xs text-primary hover:underline"
          >
            Opdater
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : drafts.length === 0 ? (
          <div className="text-center py-20">
            <CheckCircle className="w-10 h-10 text-green-500/40 mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">Ingen udkast i kø. Næste artikel genereres automatisk.</p>
          </div>
        ) : (
          <div className="grid lg:grid-cols-2 gap-4">
            {/* Draft list */}
            <div className="space-y-3">
              {drafts.map((draft) => (
                <div
                  key={draft.id}
                  className={`rounded-2xl border p-4 cursor-pointer transition-all ${previewId === draft.id ? "border-primary/50 bg-primary/5" : "border-border bg-card hover:border-primary/20"}`}
                  onClick={() => setPreviewId(previewId === draft.id ? null : draft.id)}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <span className="text-xs font-semibold text-primary/70 uppercase tracking-wider">{draft.category}</span>
                      <h3 className="font-semibold text-sm leading-snug mt-0.5">{draft.title}</h3>
                    </div>
                    <button className="text-muted-foreground hover:text-foreground flex-shrink-0">
                      {previewId === draft.id ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground mb-3 leading-relaxed">{draft.excerpt}</p>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-muted-foreground/60">{draft.read_time} læsetid · {new Date(draft.created_at).toLocaleDateString("da-DK")}</span>
                    <div className="flex gap-1 ml-auto">
                      {draft.keywords?.map(k => (
                        <span key={k} className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{k}</span>
                      ))}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 mt-3 pt-3 border-t border-border/50">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleAction(draft.id, "approve"); }}
                      disabled={actionLoading === draft.id + "approve"}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-green-500 text-white text-sm font-medium hover:bg-green-600 transition-colors disabled:opacity-50"
                    >
                      {actionLoading === draft.id + "approve" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                      Godkend
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleAction(draft.id, "reject"); }}
                      disabled={actionLoading === draft.id + "reject"}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border border-border text-sm text-muted-foreground hover:bg-muted/50 transition-colors disabled:opacity-50"
                    >
                      {actionLoading === draft.id + "reject" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
                      Afvis
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Preview panel */}
            {previewing && (
              <div className="rounded-2xl border border-border bg-card p-6 overflow-y-auto max-h-[80vh] sticky top-20">
                <p className="text-xs text-muted-foreground mb-2">{previewing.read_time} læsetid</p>
                <h1 className="font-display font-black text-xl mb-6 leading-tight">{previewing.title}</h1>
                <div className="prose-content space-y-0.5">
                  {renderMarkdown(previewing.content)}
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
