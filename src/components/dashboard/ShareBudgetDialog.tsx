import { useState, useCallback, useRef, useEffect } from "react";
import { Share2, Copy, Check, ExternalLink, Shield, User, Briefcase, MapPin, MessageCircle, FileText } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { generateShareUrl, generateRedditUrl, generateRedditText, type ShareMeta } from "@/lib/budgetShare";
import { useI18n } from "@/lib/i18n";
import { useLocale } from "@/lib/locale";
import type { BudgetProfile, ComputedBudget } from "@/lib/types";

interface Props {
  profile: BudgetProfile;
  budget: ComputedBudget;
}

export function ShareBudgetDialog({ profile, budget }: Props) {
  const { t } = useI18n();
  const locale = useLocale();
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState<"link" | "text" | null>(null);
  const [generating, setGenerating] = useState(false);
  const profileRef = useRef(profile);

  // Meta fields
  const [age, setAge] = useState("");
  const [job, setJob] = useState("");
  const [city, setCity] = useState("");
  const [question, setQuestion] = useState("");

  const buildMeta = useCallback((): ShareMeta => ({
    age: age ? parseInt(age, 10) || undefined : undefined,
    job: job.trim() || undefined,
    city: city.trim() || undefined,
    question: question.trim() || undefined,
  }), [age, job, city, question]);

  // Invalidate URL when profile/meta changes
  useEffect(() => {
    if (profileRef.current !== profile) {
      profileRef.current = profile;
    }
    setShareUrl(null);
  }, [profile, age, job, city, question]);

  const handleGenerate = useCallback(async () => {
    setGenerating(true);
    try {
      const meta = buildMeta();
      const url = await generateShareUrl(profile, meta);
      setShareUrl(url);
    } finally {
      setGenerating(false);
    }
  }, [profile, buildMeta]);

  const handleOpen = useCallback(
    async (open: boolean) => {
      if (open && !shareUrl) await handleGenerate();
    },
    [shareUrl, handleGenerate]
  );

  // Copy link
  const handleCopyLink = useCallback(async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied("link");
      setTimeout(() => setCopied(null), 2000);
    } catch {
      document.querySelector<HTMLInputElement>("#share-url-input")?.select();
    }
  }, [shareUrl]);

  // Copy as text (Reddit-optimized format)
  const handleCopyText = useCallback(async () => {
    const meta = buildMeta();
    const text = generateRedditText(profile, budget, meta, t, locale.currencyLocale);
    try {
      await navigator.clipboard.writeText(text);
      setCopied("text");
      setTimeout(() => setCopied(null), 2000);
    } catch {}
  }, [profile, budget, buildMeta, t, locale]);

  return (
    <Dialog onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        <button
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
          title={t("share.title")}
        >
          <Share2 className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">{t("dash.share")}</span>
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("share.title")}</DialogTitle>
          <DialogDescription>{t("share.description")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* ── Context Fields ── */}
          <div>
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
              {t("share.addContext")}
            </p>
            <div className="grid grid-cols-3 gap-2">
              <div className="relative">
                <User className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
                <input
                  type="number"
                  placeholder={t("share.agePlaceholder")}
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  min={16} max={99}
                  className="w-full pl-7 pr-2 py-1.5 text-xs bg-muted border border-border rounded-lg placeholder:text-muted-foreground/50"
                />
              </div>
              <div className="relative">
                <Briefcase className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
                <input
                  type="text"
                  placeholder={t("share.jobPlaceholder")}
                  value={job}
                  onChange={(e) => setJob(e.target.value)}
                  maxLength={30}
                  className="w-full pl-7 pr-2 py-1.5 text-xs bg-muted border border-border rounded-lg placeholder:text-muted-foreground/50"
                />
              </div>
              <div className="relative">
                <MapPin className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
                <input
                  type="text"
                  placeholder={t("share.cityPlaceholder")}
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  maxLength={20}
                  className="w-full pl-7 pr-2 py-1.5 text-xs bg-muted border border-border rounded-lg placeholder:text-muted-foreground/50"
                />
              </div>
            </div>

            {/* Question */}
            <div className="mt-2">
              <div className="relative">
                <MessageCircle className="absolute left-2 top-2.5 w-3 h-3 text-muted-foreground" />
                <input
                  type="text"
                  placeholder={t("share.questionPlaceholder")}
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  maxLength={150}
                  className="w-full pl-7 pr-2 py-1.5 text-xs bg-muted border border-border rounded-lg placeholder:text-muted-foreground/50"
                />
              </div>
            </div>
          </div>

          {/* ── Copy as text (Reddit-optimized) ── */}
          <button
            onClick={handleCopyText}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold border border-border hover:bg-muted transition-colors"
          >
            {copied === "text" ? (
              <><Check className="w-3.5 h-3.5" />{t("share.copiedText")}</>
            ) : (
              <><FileText className="w-3.5 h-3.5" />{t("share.copyText")}</>
            )}
          </button>

          {/* ── Link sharing ── */}
          {!shareUrl ? (
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              <Share2 className="w-3.5 h-3.5" />
              {generating ? t("share.generating") : t("share.generateLink")}
            </button>
          ) : (
            <div className="space-y-2">
              {/* URL + copy */}
              <div className="flex gap-2">
                <input
                  id="share-url-input"
                  type="text"
                  readOnly
                  value={shareUrl}
                  className="flex-1 px-3 py-2 text-xs bg-muted border border-border rounded-lg font-mono truncate"
                />
                <button
                  onClick={handleCopyLink}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  {copied === "link" ? (
                    <><Check className="w-3.5 h-3.5" />{t("share.copied")}</>
                  ) : (
                    <><Copy className="w-3.5 h-3.5" />{t("share.copyLink")}</>
                  )}
                </button>
              </div>

              {/* Reddit */}
              <a
                href={generateRedditUrl(shareUrl, question.trim() || undefined)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-lg text-xs font-semibold bg-[#FF4500] text-white hover:bg-[#FF4500]/90 transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                {t("share.reddit")}
              </a>

              <p className="text-[9px] text-muted-foreground text-center tabular-nums">
                {shareUrl.length} {t("share.chars")}
              </p>
            </div>
          )}

          {/* Privacy note */}
          <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50 border border-border/50">
            <Shield className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
            <p className="text-[10px] text-muted-foreground leading-relaxed">
              {t("share.privacyNote")}
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
