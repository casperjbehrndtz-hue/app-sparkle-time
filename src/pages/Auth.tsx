import { useState, useEffect } from "react";
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
  const [recoveryMode, setRecoveryMode] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const { signIn, signUp } = useAuth();
  const config = useWhiteLabel();
  const { t } = useI18n();
  const navigate = useNavigate();
  usePageMeta(
    t("auth.pageTitle"),
    t("auth.pageDesc")
  );

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setRecoveryMode(true);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const handlePasswordReset = async () => {
    if (!newPassword.trim() || newPassword.length < 6) {
      toast({ title: t("auth.error"), description: t("auth.passwordMinLength"), variant: "destructive" });
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setBusy(false);
    if (error) {
      toast({ title: t("auth.error"), description: error.message, variant: "destructive" });
    } else {
      toast({ title: t("auth.passwordResetSuccess"), description: t("auth.passwordResetSuccessDesc") });
      setRecoveryMode(false);
      setNewPassword("");
      navigate("/login");
    }
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      toast({ title: t("auth.enterEmail"), description: t("auth.enterEmailDesc"), variant: "destructive" });
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + "/login",
    });
    setBusy(false);
    if (error) {
      toast({ title: t("auth.error"), description: error.message, variant: "destructive" });
    } else {
      toast({ title: t("auth.checkEmail"), description: t("auth.checkEmailDesc") });
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
      toast({ title: t("auth.error"), description: error.message, variant: "destructive" });
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
            {recoveryMode ? t("auth.newPasswordSubtitle") : isLogin ? t("auth.loginSubtitle") : t("auth.signupSubtitle")}
          </p>
        </div>

        {recoveryMode ? (
          <div className="space-y-4">
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="password"
                placeholder={t("auth.newPasswordPlaceholder")}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                minLength={6}
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <button
              onClick={handlePasswordReset}
              disabled={busy}
              className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {busy ? t("auth.waiting") : t("auth.resetPassword")}
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              id="email"
              type="email"
              autoComplete="email"
              placeholder={t("auth.emailPlaceholder")}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              id="password"
              type={showPw ? "text" : "password"}
              autoComplete={isLogin ? "current-password" : "new-password"}
              placeholder={t("auth.passwordPlaceholder")}
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
            {busy ? t("auth.waiting") : isLogin ? t("auth.login") : t("auth.signup")}
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
              {t("auth.forgotPassword")}
            </button>
          )}
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="text-sm text-primary hover:underline bg-transparent border-none cursor-pointer"
          >
            {isLogin ? t("auth.noAccount") : t("auth.hasAccount")}
          </button>
          <div>
            <button
              onClick={() => navigate("/")}
              className="text-xs text-muted-foreground hover:text-foreground bg-transparent border-none cursor-pointer"
            >
              {t("auth.continueWithout")}
            </button>
          </div>
        </div>
          </>
        )}
      </motion.div>
    </div>
  );
}
