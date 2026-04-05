import { useI18n } from "@/lib/i18n";
import { usePageMeta } from "@/hooks/usePageMeta";

const NotFound = () => {
  const { t } = useI18n();
  usePageMeta({ title: "404 — " + t("notFound.message"), description: t("notFound.message"), noIndex: true });

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted">
      <div className="text-center">
        <h1 className="mb-4 text-4xl font-bold">{t("notFound.title")}</h1>
        <p className="mb-4 text-xl text-muted-foreground">{t("notFound.message")}</p>
        <a href="/" className="text-primary underline hover:text-primary/90">
          {t("notFound.link")}
        </a>
      </div>
    </div>
  );
};

export default NotFound;
