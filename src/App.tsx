import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";
import EvaluatorDashboard from "./pages/EvaluatorDashboard";
import HazardEvaluationPage from "./pages/HazardEvaluationPage";
import RoleSelection from "./pages/RoleSelection";
import FrontlinerDashboard from "./pages/FrontlinerDashboard";
import InvestigationReportGenerator from "./pages/InvestigationReportGenerator";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<RoleSelection />} />
          <Route path="/hazard-analyzer" element={<Index />} />
          <Route path="/frontliner" element={<FrontlinerDashboard />} />
          <Route path="/evaluator" element={<EvaluatorDashboard />} />
          <Route path="/evaluate/:id" element={<HazardEvaluationPage />} />
          <Route path="/investigation-report" element={<InvestigationReportGenerator />} />
          <Route path="/settings" element={<Settings />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
