import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Navigation } from "./components/Navigation";
import { ThemeProvider } from "./hooks/use-theme";
import Index from "./pages/Index";
import Dashboard from "./pages/Dashboard";
import Feed from "./pages/Feed";
import Servers from "./pages/Servers";
import ServerView from "./pages/ServerView";
import Messages from "./pages/Messages";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";
import { useEffect, useState } from "react";
import { supabase } from "./integrations/supabase/client";

const queryClient = new QueryClient();

const App = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    supabase.auth.onAuthStateChange((event, session) => {
      setIsAuthenticated(!!session);
    });

    // Check initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsAuthenticated(!!session);
    });
  }, []);

  // Show nothing while checking authentication
  if (isAuthenticated === null) return null;

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light" storageKey="app-theme">
        <TooltipProvider>
          <div className="relative min-h-screen font-sans bg-[#403E43]">
            <div className="relative z-10">
              <Toaster />
              <Sonner />
              <BrowserRouter>
                <div className="pb-16">
                  <Routes>
                    <Route path="/" element={<Navigate to="/dashboard" replace />} />
                    <Route 
                      path="/dashboard" 
                      element={isAuthenticated ? <Dashboard /> : <Index />} 
                    />
                    <Route 
                      path="/feed" 
                      element={isAuthenticated ? <Feed /> : <Navigate to="/" replace />} 
                    />
                    <Route 
                      path="/servers" 
                      element={isAuthenticated ? <Servers /> : <Navigate to="/" replace />} 
                    />
                    <Route 
                      path="/servers/:serverId" 
                      element={isAuthenticated ? <ServerView /> : <Navigate to="/" replace />} 
                    />
                    <Route 
                      path="/messages" 
                      element={isAuthenticated ? <Messages /> : <Navigate to="/" replace />} 
                    />
                    <Route 
                      path="/settings" 
                      element={isAuthenticated ? <Settings /> : <Navigate to="/" replace />} 
                    />
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                  {isAuthenticated && <Navigation />}
                </div>
              </BrowserRouter>
            </div>
          </div>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default App;