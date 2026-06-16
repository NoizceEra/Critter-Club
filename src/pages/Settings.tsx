import { useState, useEffect } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { useNavigate } from "react-router-dom";
import { Navbar } from "@/components/ui/navbar";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Palette } from "lucide-react";

const themePresets = [
  {
    name: "Purple Magic",
    primary: "270 95% 75%",
    primaryGlow: "280 95% 85%",
    accent: "290 85% 70%",
  },
  {
    name: "Ocean Blue",
    primary: "200 95% 65%",
    primaryGlow: "210 95% 75%",
    accent: "190 85% 60%",
  },
  {
    name: "Forest Green",
    primary: "140 70% 60%",
    primaryGlow: "150 70% 70%",
    accent: "130 60% 55%",
  },
  {
    name: "Sunset Orange",
    primary: "30 95% 65%",
    primaryGlow: "40 95% 75%",
    accent: "20 85% 60%",
  },
  {
    name: "Rose Pink",
    primary: "330 80% 70%",
    primaryGlow: "340 80% 80%",
    accent: "320 70% 65%",
  },
  {
    name: "Electric Teal",
    primary: "180 85% 60%",
    primaryGlow: "190 85% 70%",
    accent: "170 75% 55%",
  },
];

const Settings = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [selectedTheme, setSelectedTheme] = useState(0);

  useEffect(() => {
    if (!user) {
      navigate("/");
      return;
    }

    // Load saved theme from localStorage
    const savedTheme = localStorage.getItem("critter-club-theme");
    if (savedTheme) {
      const themeIndex = parseInt(savedTheme);
      setSelectedTheme(themeIndex);
      applyTheme(themePresets[themeIndex]);
    }
  }, [user, navigate]);

  const applyTheme = (theme: typeof themePresets[0]) => {
    const root = document.documentElement;
    root.style.setProperty("--primary", theme.primary);
    root.style.setProperty("--primary-glow", theme.primaryGlow);
    root.style.setProperty("--accent", theme.accent);
  };

  const handleThemeChange = (index: number) => {
    setSelectedTheme(index);
    applyTheme(themePresets[index]);
    localStorage.setItem("critter-club-theme", index.toString());
    toast.success("Theme updated!");
  };

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold text-gradient mb-8">Settings</h1>

        <Card className="p-6 max-w-4xl">
          <div className="flex items-center gap-2 mb-6">
            <Palette className="w-6 h-6 text-primary" />
            <h2 className="text-2xl font-bold">Theme Customization</h2>
          </div>

          <Label className="text-base mb-4 block">
            Choose your favorite color theme:
          </Label>

          <div className="grid md:grid-cols-3 gap-4">
            {themePresets.map((theme, index) => (
              <button
                key={theme.name}
                onClick={() => handleThemeChange(index)}
                className={`p-4 rounded-lg border-2 transition-all ${
                  selectedTheme === index
                    ? "border-primary shadow-lg scale-105"
                    : "border-border hover:border-primary/50"
                }`}
              >
                <div className="flex items-center gap-3 mb-2">
                  <div
                    className="w-8 h-8 rounded-full"
                    style={{ backgroundColor: `hsl(${theme.primary})` }}
                  />
                  <span className="font-semibold">{theme.name}</span>
                </div>
                <div className="flex gap-2">
                  <div
                    className="w-6 h-6 rounded"
                    style={{ backgroundColor: `hsl(${theme.primary})` }}
                  />
                  <div
                    className="w-6 h-6 rounded"
                    style={{ backgroundColor: `hsl(${theme.primaryGlow})` }}
                  />
                  <div
                    className="w-6 h-6 rounded"
                    style={{ backgroundColor: `hsl(${theme.accent})` }}
                  />
                </div>
              </button>
            ))}
          </div>

          <div className="mt-8 p-4 bg-muted/50 rounded-lg">
            <p className="text-sm text-muted-foreground">
              <strong>Note:</strong> Your theme preference is saved locally and will
              persist across sessions.
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Settings;

