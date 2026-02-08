import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import Skema from "./pages/Skema";
import Index from "./pages/Index";
import Tournament from "./pages/Tournament";
import Auth from "./pages/Auth";
import Guardian from "./pages/Guardian";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          {/* Public route */}
          <Route path="/auth" element={<Auth />} />
          
          {/* Guardian panel - requires master_admin or guardiao role (access controlled inside) */}
          <Route path="/guardian" element={
            <ProtectedRoute>
              <Guardian />
            </ProtectedRoute>
          } />
          
          {/* Protected routes - player only (guardians redirected to /guardian) */}
          <Route path="/" element={<ProtectedRoute playerOnly><Skema /></ProtectedRoute>} />
          <Route path="/convite/:code" element={<ProtectedRoute playerOnly><Skema /></ProtectedRoute>} />
          <Route path="/invite/:code" element={<ProtectedRoute playerOnly><Skema /></ProtectedRoute>} />
          <Route path="/classic" element={<ProtectedRoute playerOnly><Index /></ProtectedRoute>} />
          <Route path="/tournament" element={<ProtectedRoute playerOnly><Tournament /></ProtectedRoute>} />
          
          {/* Fallback */}
          <Route path="*" element={<ProtectedRoute playerOnly><Skema /></ProtectedRoute>} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
