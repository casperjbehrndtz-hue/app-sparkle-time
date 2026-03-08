import { Component, type ReactNode } from "react";
import { AlertTriangle } from "lucide-react";

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
      return (
        <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-6 text-center">
          <AlertTriangle className="w-6 h-6 text-destructive mx-auto mb-2" />
          <p className="text-sm font-medium text-destructive">
            {this.props.fallbackTitle ?? "Denne sektion"} kunne ikke vises
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Prøv at genindlæse siden
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: undefined })}
            className="mt-3 text-xs text-primary hover:underline"
          >
            Prøv igen
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
