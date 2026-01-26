import { Switch, Route } from "wouter";
import { Suspense, lazy } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Spinner } from "@/components/ui/spinner";
import NotFound from "@/pages/not-found";

/**
 * Code Splitting with React.lazy()
 * 
 * Page components are lazy-loaded to reduce the initial bundle size.
 * Each page is loaded on-demand when the user navigates to that route,
 * significantly improving the initial page load time.
 * 
 * Benefits:
 * - Smaller initial JavaScript bundle
 * - Faster Time to Interactive (TTI)
 * - Resources loaded only when needed
 */
const Home = lazy(() => import("@/pages/Home"));
const ToolPage = lazy(() => import("@/pages/Tool"));
const About = lazy(() => import("@/pages/About"));
const Privacy = lazy(() => import("@/pages/Privacy"));
const Terms = lazy(() => import("@/pages/Terms"));
const Feedback = lazy(() => import("@/pages/Feedback"));
const AdminFeedback = lazy(() => import("@/pages/AdminFeedback"));

/**
 * PageLoader - Loading fallback component for lazy-loaded pages
 * Displayed while the page component is being fetched and loaded
 */
function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50/50">
      <div className="text-center space-y-4">
        <Spinner className="h-8 w-8 mx-auto text-primary" />
        <p className="text-muted-foreground text-sm">Loading...</p>
      </div>
    </div>
  );
}

function Router() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/about" component={About} />
        <Route path="/privacy" component={Privacy} />
        <Route path="/terms" component={Terms} />
        <Route path="/feedback" component={Feedback} />
        <Route path="/tool/:id" component={ToolPage} />
        <Route path="/admin/feedback" component={AdminFeedback} />
        <Route path="/:id" component={ToolPage} />
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
