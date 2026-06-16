import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./components/auth/AuthProvider";
import { ThemeProvider } from "next-themes";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Adopt from "./pages/Adopt";
import PetDetail from "./pages/PetDetail";
import Shop from "./pages/Shop";
import Community from "./pages/Community";
import Leaderboard from "./pages/Leaderboard";
import Chat from "./pages/Chat";
import Battle from "./pages/Battle";
import Settings from "./pages/Settings";
import Profile from "./pages/Profile";
import Quests from "./pages/Quests";
import Marketplace from "./pages/Marketplace";
import Bank from "./pages/Bank";
import NotFound from "./pages/NotFound";
import { SolanaWalletProvider } from "./components/solana/WalletProvider";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <SolanaWalletProvider>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AuthProvider>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/adopt" element={<Adopt />} />
                <Route path="/pet/:id" element={<PetDetail />} />
                <Route path="/quests" element={<Quests />} />
                <Route path="/shop" element={<Shop />} />
                <Route path="/community" element={<Community />} />
                <Route path="/leaderboard" element={<Leaderboard />} />
                <Route path="/chat" element={<Chat />} />
                <Route path="/battle" element={<Battle />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/profile/:userId" element={<Profile />} />
                <Route path="/marketplace" element={<Marketplace />} />
                <Route path="/bank" element={<Bank />} />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </AuthProvider>
          </BrowserRouter>
        </TooltipProvider>
      </ThemeProvider>
    </SolanaWalletProvider>
  </QueryClientProvider>
);

export default App;
