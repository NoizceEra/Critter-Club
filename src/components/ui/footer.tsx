import { Link } from "react-router-dom";
import { Sparkles, Heart, Copy } from "lucide-react";
import { toast } from "sonner";

export const Footer = () => {
  const contractAddress = "6vjQQTFQmYg6xummvLBJshY7Kkz7rrSkdDnd9dqSpump";

  const copyToClipboard = () => {
    navigator.clipboard.writeText(contractAddress);
    toast.success("Contract address copied to clipboard!");
  };

  return (
    <footer className="border-t bg-card/30 backdrop-blur-sm mt-auto">
      <div className="container mx-auto px-4 py-8">
        <div className="grid md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="space-y-4">
            <Link to="/" className="flex items-center gap-2 font-bold text-xl">
              <Sparkles className="w-6 h-6 text-primary" />
              <span className="text-gradient">Critter Club</span>
            </Link>
            <p className="text-sm text-muted-foreground">
              Your magical world of adorable virtual pets
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-semibold mb-4">Quick Links</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/dashboard" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  My Pets
                </Link>
              </li>
              <li>
                <Link to="/adopt" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  Adopt
                </Link>
              </li>
              <li>
                <Link to="/shop" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  Shop
                </Link>
              </li>
              <li>
                <Link to="/leaderboard" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  Leaderboard
                </Link>
              </li>
            </ul>
          </div>

          {/* Community */}
          <div>
            <h3 className="font-semibold mb-4">Community</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/community" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  Community
                </Link>
              </li>
              <li>
                <Link to="/chat" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  Chat
                </Link>
              </li>
              <li>
                <Link to="/battle" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  Battle
                </Link>
              </li>
            </ul>
          </div>

          {/* Connect */}
          <div>
            <h3 className="font-semibold mb-4">Connect</h3>
            <ul className="space-y-2">
              <li>
                <a 
                  href="https://x.com/CritterClub_Fun" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-sm text-muted-foreground hover:text-primary transition-colors flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                  </svg>
                  Follow us on X
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t mt-8 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex flex-col items-center md:items-start gap-2">
            <p className="text-sm text-muted-foreground">
              © 2025 Critter Club. Made with <Heart className="w-4 h-4 inline text-secondary" /> for pet lovers everywhere.
            </p>
            <button
              onClick={copyToClipboard}
              className="flex items-center gap-2 text-xs text-muted-foreground hover:text-primary transition-colors group"
              title="Click to copy $CRITTERS contract address"
            >
              <span className="font-semibold text-primary/70">$CRITTERS:</span>
              <span className="font-mono truncate max-w-[200px]">{contractAddress}</span>
              <Copy className="w-3 h-3 group-hover:scale-110 transition-transform flex-shrink-0" />
            </button>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/settings" className="text-sm text-muted-foreground hover:text-primary transition-colors">
              Settings
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

