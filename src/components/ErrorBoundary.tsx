import { Component, type ReactNode } from "react";
import { DA } from "@/lib/texts.da";
import { EN } from "@/lib/texts.en";
import { NO } from "@/lib/texts.no";

function getStaticT(): (key: string) => string {
  try {
    const saved = localStorage.getItem("kassen_lang");
    if (saved === "en") return (key: string) => EN[key] ?? DA[key] ?? key;
  } catch {}
  const buildLocale = (import.meta.env.VITE_LOCALE ?? "da") as string;
  if (buildLocale === "no") return (key: string) => NO[key] ?? key;
  return (key: string) => DA[key] ?? key;
}

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      const t = getStaticT();
      return (
        <div className="min-h-screen flex items-center justify-center bg-background px-6">
          <div className="text-center max-w-md space-y-4">
            <div className="text-5xl">😵</div>
            <h1 className="text-xl font-bold text-foreground">{t("error.somethingWrong")}</h1>
            <p className="text-sm text-muted-foreground">
              {t("error.unexpectedError")}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center justify-center rounded-lg bg-primary text-primary-foreground px-6 py-2.5 text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              {t("error.reloadPage")}
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
