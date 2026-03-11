import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Mail, Lock, ArrowRight, Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useWhiteLabel } from "@/lib/whiteLabel";
import { useI18n } from "@/lib/i18n";
import { toast } from "@/hooks/use-toast";
import { usePageMeta } from "@/hooks/usePageMeta";
import { supabase } from "@/integrations/supabase/client";

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);
  const { signIn, signUp } = useAuth();
  const config = useWhiteLabel();
  const { t } = useI18n();
  const navigate = useNavigate();
  usePageMeta(
    "Log ind — Kassen",
    "Log ind eller opret en gratis konto for at synkronisere dit budget på tværs af enheder."
  );

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      toast({ title: "Indtast e-mail", description: "Skriv din e-mail ovenfor, så sender vi et link til nulstilling.", variant: "destructive" });
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + "/login",
    });
    setBusy(false);
    if (error) {
      toast({ title: "Fejl", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Tjek din e-mail", description: "Vi har sendt et link til nulstilling af din adgangskode." });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = isLogin
      ? await signIn(email, password)
      : await signUp(email, password);
    setBusy(false);

    if (error) {
      toast({ title: "Fejl", description: error.message, variant: "destructive" });
      return;
    }

    if (!isLogin) {
      toast({ title: "Tjek din e-mail", description: "Vi har sendt et bekræftelseslink." });
      return;
    }
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm"
      >
        <div className="text-center mb-8">
          <span className="font-display font-black text-2xl text-primary">{config.brandName}</span>
          <p className="text-muted-foreground text-sm mt-2">
            {isLogin ? "Log ind for at synkronisere dit budget" : "Opret konto og gem dit budget i skyen"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="email"
              placeholder="E-mail"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type={showPw ? "text" : "password"}
              placeholder="Adgangskode"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full pl-10 pr-10 py-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          <button
            type="submit"
            disabled={busy}
            className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {busy ? "Vent..." : isLogin ? "Log ind" : "Opret konto"}
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="text-center mt-6 space-y-2">
          {isLogin && (
            <button
              onClick={handleForgotPassword}
              disabled={busy}
              className="text-xs text-muted-foreground hover:text-primary bg-transparent border-none cursor-pointer hover:underline"
            >
              Glemt kodeord?
            </button>
          )}
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="text-sm text-primary hover:underline bg-transparent border-none cursor-pointer"
          >
            {isLogin ? "Har du ingen konto? Opret gratis" : "Har du allerede en konto? Log ind"}
          </button>
          <div>
            <button
              onClick={() => navigate("/")}
              className="text-xs text-muted-foreground hover:text-foreground bg-transparent border-none cursor-pointer"
            >
              ← Fortsæt uden login
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
