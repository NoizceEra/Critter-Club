import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/components/auth/AuthProvider";
import { Button } from "./button";
import { Sheet, SheetContent, SheetTrigger } from "./sheet";
import { Sparkles, Store, LogOut, User, Users, Trophy, MessageCircle, Swords, Menu, Settings, Moon, Sun, Zap, ShoppingBag, Landmark } from "lucide-react";
import { useState } from "react";
import { useTheme } from "next-themes";
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';

export const Navbar = () => {
  const { user, signOut } = useAuth();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const { theme, setTheme } = useTheme();

  const navLinks = [
    { to: "/dashboard", icon: User, label: "My Pets" },
    { to: "/quests", icon: Zap, label: "Quests" },
    { to: "/shop", icon: Store, label: "Shop" },
    { to: "/marketplace", icon: ShoppingBag, label: "Marketplace" },
    { to: "/bank", icon: Landmark, label: "Bank" },
    { to: "/community", icon: Users, label: "Community" },
    { to: "/leaderboard", icon: Trophy, label: "Leaderboard" },
    { to: "/chat", icon: MessageCircle, label: "Chat" },
    { to: "/battle", icon: Swords, label: "Battle" },
    { to: "/settings", icon: Settings, label: "Settings" },
  ];

  return (
    <nav className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/" className="flex items-center gap-2 font-bold text-xl">
            <Sparkles className="w-6 h-6 text-primary" />
            <span className="text-gradient hidden sm:inline">Critter Club</span>
            <span className="text-gradient sm:hidden">CC</span>
          </Link>
          <a 
            href="https://x.com/CritterClub_Fun" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-muted-foreground hover:text-primary transition-colors"
            aria-label="Follow us on Twitter"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
            </svg>
          </a>
        </div>

        {user && (
          <>
            {/* Desktop Navigation */}
            <div className="hidden lg:flex items-center gap-2">
              {navLinks.map(({ to, icon: Icon, label }) => (
                <Link key={to} to={to}>
                  <Button
                    variant={location.pathname === to ? "default" : "ghost"}
                    size="sm"
                  >
                    <Icon className="w-4 h-4 mr-2" />
                    {label}
                  </Button>
                </Link>
              ))}
              <div className="ml-2">
                <WalletMultiButton style={{ height: '36px', lineHeight: '36px', padding: '0 16px', fontSize: '0.875rem', backgroundColor: 'hsl(var(--primary))', color: 'hsl(var(--primary-foreground))', borderRadius: 'calc(var(--radius) - 2px)' }} />
              </div>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              >
                {theme === "dark" ? (
                  <Sun className="w-4 h-4" />
                ) : (
                  <Moon className="w-4 h-4" />
                )}
              </Button>
              <Button variant="outline" size="sm" onClick={() => signOut()}>
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </Button>
            </div>

            {/* Mobile Navigation */}
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild className="lg:hidden">
                <Button variant="ghost" size="sm">
                  <Menu className="w-5 h-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-64">
                <div className="flex flex-col gap-4 mt-8">
                  {navLinks.map(({ to, icon: Icon, label }) => (
                    <Link key={to} to={to} onClick={() => setOpen(false)}>
                      <Button
                        variant={location.pathname === to ? "default" : "ghost"}
                        className="w-full justify-start"
                      >
                        <Icon className="w-4 h-4 mr-2" />
                        {label}
                      </Button>
                    </Link>
                  ))}
                  <div className="w-full">
                    <WalletMultiButton style={{ width: '100%', justifyContent: 'center', height: '40px', backgroundColor: 'hsl(var(--primary))', color: 'hsl(var(--primary-foreground))', borderRadius: 'calc(var(--radius) - 2px)' }} />
                  </div>
                  <Button
                    variant="ghost"
                    className="w-full justify-start"
                    onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                  >
                    {theme === "dark" ? (
                      <>
                        <Sun className="w-4 h-4 mr-2" />
                        Light Mode
                      </>
                    ) : (
                      <>
                        <Moon className="w-4 h-4 mr-2" />
                        Dark Mode
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => {
                      signOut();
                      setOpen(false);
                    }}
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Sign Out
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
          </>
        )}
      </div>
    </nav>
  );
};

