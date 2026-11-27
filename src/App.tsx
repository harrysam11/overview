import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { isLocalMode } from "./lib/appMode";
import { LocalVaultGate } from "./components/LocalVaultGate";
import { CloudAuthGate } from "./components/CloudAuthGate";
import Landing from "./pages/Landing";
import LifeOS from "./pages/LifeOS";
import NotFound from "./pages/NotFound";

// Local-mode pages (never import the cloud client).
const LocalHabits = lazy(() => import("./pages/LocalHabits"));
const LocalData = lazy(() => import("./pages/LocalData"));
const LocalSocial = lazy(() => import("./pages/LocalSocial"));
const LocalOnlyNotice = lazy(() => import("./pages/LocalOnlyNotice"));
const LocalNotes = lazy(() => import("./pages/LocalNotes"));
const LocalFinance = lazy(() => import("./pages/LocalFinance"));
const LocalFiles = lazy(() => import("./pages/LocalFiles"));

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
    <Route path="/social" element={<LocalSocial />} />
    <Route path="/ideas" element={<IdeasBoard />} />
    <Route path="/planner" element={<WeeklyPlanner />} />
    <Route path="/roadmap" element={<GoalRoadmap />} />
    <Route path="/diary" element={<Diary />} />
    <Route path="/notes" element={<LocalNotes />} />
    <Route path="/finance" element={<LocalFinance />} />
    <Route path="/files" element={<LocalFiles />} />
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
    <Route path="/notes" element={<LocalNotes />} />
    <Route path="/finance" element={<LocalFinance />} />
    <Route path="/files" element={<LocalFiles />} />
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
        {isLocalMode ? (
          <LocalVaultGate>
            <BrowserRouter>
              <Suspense fallback={<Loading />}>
                <Routes>
                  <Route path="/" element={<Landing />} />
                  <Route path="/dashboard" element={<LifeOS />} />
                  {localRoutes}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
            </BrowserRouter>
          </LocalVaultGate>
        ) : (
          <BrowserRouter>
            <CloudAuthGate>
              <Suspense fallback={<Loading />}>
                <Routes>
                  <Route path="/" element={<Landing />} />
                  <Route path="/dashboard" element={<LifeOS />} />
                  {cloudRoutes}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
            </CloudAuthGate>
          </BrowserRouter>
        )}
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
