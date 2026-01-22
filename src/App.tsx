import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Skema from "./pages/Skema";
import Index from "./pages/Index";
import Tournament from "./pages/Tournament";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Skema />} />
          <Route path="/convite/:code" element={<Skema />} />
          <Route path="/invite/:code" element={<Skema />} />
          <Route path="/classic" element={<Index />} />
          <Route path="/tournament" element={<Tournament />} />
          <Route path="*" element={<Skema />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
