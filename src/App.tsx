import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { isLocalMode } from "./lib/appMode";
import Landing from "./pages/Landing";
import LifeOS from "./pages/LifeOS";
import NotFound from "./pages/NotFound";

// Local-mode pages (never import the cloud client).
const LocalHabits = lazy(() => import("./pages/LocalHabits"));
const LocalData = lazy(() => import("./pages/LocalData"));
const LocalOnlyNotice = lazy(() => import("./pages/LocalOnlyNotice"));

// Cloud-mode pages: loaded only when VITE_DATA_MODE=cloud, so local mode makes no cloud requests.
const Auth = lazy(() => import("./pages/Auth"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Social = lazy(() => import("./pages/Social"));
const IdeasBoard = lazy(() => import("./pages/IdeasBoard"));
const WeeklyPlanner = lazy(() => import("./pages/WeeklyPlanner"));
const GoalRoadmap = lazy(() => import("./pages/GoalRoadmap"));
const Diary = lazy(() => import("./pages/Diary"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const OfflineIndicator = lazy(() =>
  import("./components/OfflineIndicator").then((m) => ({ default: m.OfflineIndicator })),
);

const queryClient = new QueryClient();

const Loading = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
  </div>
);

const localRoutes = (
  <>
    <Route path="/habits" element={<LocalHabits />} />
    <Route path="/data" element={<LocalData />} />
    <Route path="/auth" element={<LifeOS />} />
    <Route path="/reset-password" element={<LifeOS />} />
    <Route path="/social" element={<LocalOnlyNotice feature="Friends, chat & challenges" reason="online" />} />
    <Route path="/ideas" element={<LocalOnlyNotice feature="Ideas board" reason="later" />} />
    <Route path="/planner" element={<LocalOnlyNotice feature="Weekly planner" reason="later" />} />
    <Route path="/roadmap" element={<LocalOnlyNotice feature="Goal roadmap" reason="later" />} />
    <Route path="/diary" element={<LocalOnlyNotice feature="Universal diary" reason="later" />} />
  </>
);

const cloudRoutes = (
  <>
    <Route path="/auth" element={<Auth />} />
    <Route path="/habits" element={<Dashboard />} />
    <Route path="/social" element={<Social />} />
    <Route path="/ideas" element={<IdeasBoard />} />
    <Route path="/planner" element={<WeeklyPlanner />} />
    <Route path="/roadmap" element={<GoalRoadmap />} />
    <Route path="/diary" element={<Diary />} />
    <Route path="/reset-password" element={<ResetPassword />} />
  </>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        {!isLocalMode && (
          <Suspense fallback={null}>
            <OfflineIndicator />
          </Suspense>
        )}
        <BrowserRouter>
          <Suspense fallback={<Loading />}>
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/dashboard" element={<LifeOS />} />
              {isLocalMode ? localRoutes : cloudRoutes}
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
