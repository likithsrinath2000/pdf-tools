import React, { Component, ErrorInfo, ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw, Home, Bug, Coffee } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

const funnyErrorMessages = [
  "Well, this is awkward... Something went terribly wrong.",
  "Oops! Our code tripped over its own shoelaces.",
  "Houston, we have a JavaScript problem.",
  "The hamsters powering our servers need a break.",
  "Error 500: The server ate something that didn't agree with it.",
  "Our code just had an existential crisis.",
  "Something broke. We blame the intern. (Just kidding, we don't have one.)",
  "The pixels are staging a rebellion.",
  "This wasn't supposed to happen. Famous last words.",
  "Plot twist: The real error was the friends we made along the way.",
];

const funnySubtexts = [
  "Have you tried turning it off and on again?",
  "Maybe the code needs a coffee break too?",
  "Our developers are probably fixing this right now... hopefully.",
  "At least your PDFs are safe. We think.",
  "This error message cost us 3 hours to write. Worth it.",
];

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.href = "/";
  };

  public render() {
    if (this.state.hasError) {
      const randomMessage = funnyErrorMessages[Math.floor(Math.random() * funnyErrorMessages.length)];
      const randomSubtext = funnySubtexts[Math.floor(Math.random() * funnySubtexts.length)];

      return (
        <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
          <Card className="w-full max-w-lg mx-4 shadow-xl border-2 overflow-hidden">
            <div className="bg-gradient-to-r from-orange-500 to-red-600 p-6 text-white text-center">
              <div className="flex justify-center mb-4">
                <div className="relative">
                  <AlertTriangle className="h-24 w-24 animate-pulse" />
                  <Bug className="absolute -bottom-2 -right-2 h-8 w-8 animate-bounce" />
                </div>
              </div>
              <h1 className="text-4xl font-bold mb-2">Oops!</h1>
              <p className="text-xl font-medium opacity-90">Something Went Wrong</p>
            </div>
            
            <CardContent className="pt-8 pb-8 text-center space-y-6">
              <div className="space-y-3">
                <p className="text-lg font-medium text-gray-800">
                  {randomMessage}
                </p>
                <p className="text-sm text-gray-500 italic">
                  {randomSubtext}
                </p>
              </div>

              <div className="flex items-center justify-center gap-2 text-sm text-gray-400">
                <Coffee className="h-4 w-4" />
                <span>Deep breaths. Everything will be fine.</span>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
                <Button 
                  onClick={this.handleReload} 
                  className="gap-2 w-full sm:w-auto"
                  data-testid="button-try-again"
                >
                  <RefreshCw className="h-4 w-4" />
                  Try Again
                </Button>
                <Button 
                  variant="outline" 
                  onClick={this.handleGoHome}
                  className="gap-2 w-full sm:w-auto"
                  data-testid="button-go-home"
                >
                  <Home className="h-4 w-4" />
                  Go Home
                </Button>
              </div>

              {process.env.NODE_ENV === "development" && this.state.error && (
                <details className="mt-6 text-left bg-gray-100 rounded-lg p-4">
                  <summary className="text-sm font-medium text-gray-700 cursor-pointer">
                    Technical Details (for nerds)
                  </summary>
                  <pre className="mt-2 text-xs text-red-600 overflow-auto max-h-40">
                    {this.state.error.toString()}
                    {this.state.errorInfo?.componentStack}
                  </pre>
                </details>
              )}

              <p className="text-xs text-gray-400 pt-4">
                Error ID: {Date.now().toString(36).toUpperCase()} (We made this up, but it looks official)
              </p>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
