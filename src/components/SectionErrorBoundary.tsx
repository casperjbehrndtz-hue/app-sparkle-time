import { Component, type ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import { DA } from "@/lib/texts.da";
import { NO } from "@/lib/texts.no";

function getStaticT(): (key: string) => string {
  const buildLocale = (import.meta.env.VITE_LOCALE ?? "da") as string;
  if (buildLocale === "no") return (key: string) => NO[key] ?? key;
  return (key: string) => DA[key] ?? key;
}

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error?: Error;
}

/**
 * Per-section error boundary — prevents a single dashboard section
 * from crashing the entire app.
 */
export class SectionErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error) {
    console.error(`[SectionErrorBoundary] ${this.props.fallbackTitle ?? "Section"} crashed:`, error);
  }

  render() {
    if (this.state.hasError) {
      const t = getStaticT();
      return (
        <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-6 text-center">
          <AlertTriangle className="w-6 h-6 text-destructive mx-auto mb-2" />
          <p className="text-sm font-medium text-destructive">
            {this.props.fallbackTitle ?? "Section"} {t("error.sectionFailed")}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {t("error.tryReload")}
          </p>
          {this.state.error && (
            <pre className="mt-2 text-[10px] text-left text-muted-foreground bg-muted p-2 rounded overflow-auto max-h-24">
              {this.state.error.message}
              {"\n"}
              {this.state.error.stack?.split("\n").slice(0, 4).join("\n")}
            </pre>
          )}
          <button
            onClick={() => this.setState({ hasError: false, error: undefined })}
            className="mt-3 text-xs text-primary hover:underline"
          >
            {t("error.tryAgain")}
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
