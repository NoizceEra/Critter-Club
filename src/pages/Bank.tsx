import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/components/auth/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { PublicKey } from "@solana/web3.js";
import { getAssociatedTokenAddress, getAccount, getMint } from "@solana/spl-token";
import { Navbar } from "@/components/ui/navbar";
import { Footer } from "@/components/ui/footer";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  Building, ArrowDownToLine, ArrowUpFromLine, Coins,
  Wallet, TrendingUp, Shield, Zap, Star, Copy, ExternalLink,
} from "lucide-react";
import { CRITTERS_TOKEN_MINT, shortenAddress } from "@/lib/walletAuth";

const Bank = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { publicKey, connected } = useWallet();
  const { connection } = useConnection();

  const [petPoints, setPetPoints] = useState<number>(0);
  const [critterBalance, setCritterBalance] = useState<number | null>(null);
  const [loadingBalance, setLoadingBalance] = useState(false);
  const [depositAmount, setDepositAmount] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) { navigate("/"); return; }
    supabase
      .from("profiles")
      .select("pet_points")
      .eq("id", user.id)
      .single()
      .then(({ data }) => { if (data) setPetPoints(data.pet_points ?? 0); });
  }, [user, navigate]);

  // Fetch live $CRITTERS balance from chain whenever wallet connects
  useEffect(() => {
    if (!publicKey || !connected) { setCritterBalance(null); return; }
    setLoadingBalance(true);
    (async () => {
      try {
        const mint = new PublicKey(CRITTERS_TOKEN_MINT);
        const mintInfo = await getMint(connection, mint);
        const ata = await getAssociatedTokenAddress(mint, publicKey);
        const account = await getAccount(connection, ata);
        setCritterBalance(Number(account.amount) / Math.pow(10, mintInfo.decimals));
      } catch {
        setCritterBalance(0); // No token account = zero balance
      } finally {
        setLoadingBalance(false);
      }
    })();
  }, [publicKey, connected, connection]);

  const handleDeposit = async () => {
    if (!publicKey) {
      toast.error("Connect your Solana wallet first.");
      return;
    }
    const amount = parseFloat(depositAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error("Enter a valid amount to deposit.");
      return;
    }
    setLoading(true);
    try {
      // MVP: optimistic off-chain credit. Replace with on-chain listener / Edge Function
      // that verifies the SPL token transfer to the treasury before crediting.
      const newBalance = petPoints + amount;
      await supabase.from("profiles").update({ pet_points: newBalance }).eq("id", user?.id);
      setPetPoints(newBalance);
      setDepositAmount("");
      toast.success(`Deposited ${amount} $CRITTERS to your in-game balance.`);
    } catch (err: any) {
      toast.error(err.message || "Deposit failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleWithdraw = async () => {
    if (!publicKey) {
      toast.error("Connect your Solana wallet first.");
      return;
    }
    const amount = parseFloat(withdrawAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error("Enter a valid amount to withdraw.");
      return;
    }
    if (amount > petPoints) {
      toast.error("Insufficient in-game balance.");
      return;
    }
    setLoading(true);
    try {
      // MVP: deduct off-chain. Replace with Edge Function that sends SPL tokens
      // from treasury to user's wallet after verifying the deduction.
      const newBalance = petPoints - amount;
      await supabase.from("profiles").update({ pet_points: newBalance }).eq("id", user?.id);
      setPetPoints(newBalance);
      setWithdrawAmount("");
      toast.success(`Withdrawal of ${amount} $CRITTERS is processing.`);
    } catch (err: any) {
      toast.error(err.message || "Withdrawal failed.");
    } finally {
      setLoading(false);
    }
  };

  const copyCA = () => {
    navigator.clipboard.writeText(CRITTERS_TOKEN_MINT);
    toast.success("Contract address copied!");
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <div className="flex-1 container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-8">

          {/* Header */}
          <div className="flex items-center gap-3">
            <Building className="w-7 h-7 text-primary flex-shrink-0" />
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-gradient">$CRITTERS Bank</h1>
              <p className="text-sm text-muted-foreground">Deposit, withdraw, and track your token economy</p>
            </div>
          </div>

          {/* Balance Row */}
          <div className="grid md:grid-cols-3 gap-4">
            {/* PetPoints */}
            <Card className="gradient-card shadow-card md:col-span-1">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs uppercase tracking-wide text-muted-foreground flex items-center gap-2">
                  <Coins className="w-4 h-4 text-accent" /> PetPoints
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{petPoints.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground mt-1">In-game balance</p>
              </CardContent>
            </Card>

            {/* $CRITTERS on-chain */}
            <Card className="gradient-card shadow-card border-primary/20 md:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs uppercase tracking-wide text-muted-foreground flex items-center gap-2">
                  <Wallet className="w-4 h-4 text-primary" /> $CRITTERS Wallet Balance
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!connected ? (
                  <div className="flex items-center gap-3">
                    <p className="text-sm text-muted-foreground">Connect wallet to see on-chain balance</p>
                    <div className="[&>button]:!h-9 [&>button]:!text-sm [&>button]:!rounded-md [&>button]:!bg-primary [&>button]:!text-primary-foreground flex-shrink-0">
                      <WalletMultiButton />
                    </div>
                  </div>
                ) : loadingBalance ? (
                  <p className="text-3xl font-bold text-muted-foreground animate-pulse">···</p>
                ) : (
                  <div className="flex items-end justify-between">
                    <div>
                      <p className="text-3xl font-bold">{critterBalance?.toLocaleString() ?? "0"}</p>
                      <p className="text-xs font-mono text-muted-foreground mt-1">
                        {shortenAddress(publicKey!.toBase58(), 6)}
                      </p>
                    </div>
                    <WalletMultiButton style={{ height: "36px", fontSize: "0.75rem", borderRadius: "calc(var(--radius) - 2px)" }} />
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Deposit / Withdraw */}
          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <ArrowDownToLine className="w-5 h-5 text-green-500" />
                  <CardTitle>Deposit</CardTitle>
                </div>
                <CardDescription>Transfer $CRITTERS from your wallet into the game.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Input
                  type="number"
                  placeholder="Amount to deposit"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  min="0"
                />
                <Button
                  className="w-full shadow-button"
                  onClick={handleDeposit}
                  disabled={loading || !publicKey || !depositAmount}
                >
                  Deposit $CRITTERS
                </Button>
                <p className="text-xs text-muted-foreground">
                  Wallet-to-game bridge. On-chain verification via Edge Function coming soon.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <ArrowUpFromLine className="w-5 h-5 text-destructive" />
                  <CardTitle>Withdraw</CardTitle>
                </div>
                <CardDescription>Send $CRITTERS from the game back to your wallet.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Input
                  type="number"
                  placeholder="Amount to withdraw"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  max={petPoints}
                  min="0"
                />
                <Button
                  className="w-full"
                  variant="outline"
                  onClick={handleWithdraw}
                  disabled={loading || !publicKey || !withdrawAmount || parseFloat(withdrawAmount) > petPoints}
                >
                  Withdraw $CRITTERS
                </Button>
                <p className="text-xs text-muted-foreground">
                  Treasury disbursement. Processed via Edge Function after verification.
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Contract Address */}
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                    $CRITTERS Contract Address · Solana
                  </p>
                  <p className="font-mono text-sm break-all">{CRITTERS_TOKEN_MINT}</p>
                </div>
                <div className="flex gap-3 flex-shrink-0">
                  <button onClick={copyCA} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors">
                    <Copy className="w-4 h-4" /> Copy
                  </button>
                  <a
                    href={`https://solscan.io/token/${CRITTERS_TOKEN_MINT}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" /> Solscan
                  </a>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Economy Overview */}
          <div className="space-y-4">
            <h2 className="text-xl font-bold">$CRITTERS Economy</h2>
            <div className="grid md:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-green-500" /> How to Earn
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {[
                    { label: "Win PvP battles", detail: "Top finishers earn $CRITTERS each season", badge: "Battle" },
                    { label: "Leaderboard rewards", detail: "Weekly distributions to top-ranked trainers", badge: "Season" },
                    { label: "Rare critter discovery", detail: "First to adopt a rare species earns a bonus", badge: "Discovery" },
                    { label: "Hold $CRITTERS", detail: "Passive PetPoints multiplier for holders", badge: "Holder" },
                  ].map((item) => (
                    <div key={item.label} className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium">{item.label}</p>
                        <p className="text-xs text-muted-foreground">{item.detail}</p>
                      </div>
                      <Badge variant="secondary" className="text-xs flex-shrink-0">{item.badge}</Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Star className="w-4 h-4 text-accent" /> How to Spend
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {[
                    { label: "Unlock rare species", detail: "Gorilla, Mythic, and Limited critters", badge: "Exclusive" },
                    { label: "Premium cosmetics", detail: "Animated skins and rare color palettes", badge: "Cosmetic" },
                    { label: "Tournament entry", detail: "High-stakes PvP with prize pools", badge: "Tournament" },
                    { label: "Marketplace trades", detail: "Buy and sell pets with $CRITTERS", badge: "Trading" },
                  ].map((item) => (
                    <div key={item.label} className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium">{item.label}</p>
                        <p className="text-xs text-muted-foreground">{item.detail}</p>
                      </div>
                      <Badge variant="outline" className="text-xs flex-shrink-0">{item.badge}</Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>

            {/* Holder Tiers */}
            <Card className="border-primary/20 bg-primary/5">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Shield className="w-4 h-4 text-primary" />
                  Holder Tiers
                  <Badge className="text-xs">Coming Soon</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    { tier: "Hatchling", amount: "10K+", perks: "+5% PP per action · Blue username" },
                    { tier: "Breeder", amount: "100K+", perks: "+15% PP · Exclusive species · Gold username" },
                    { tier: "Legend", amount: "1M+", perks: "+30% PP · Legendary critters · Animated badge" },
                  ].map((tier) => (
                    <div key={tier.tier} className="text-center p-3 rounded-lg bg-card border">
                      <p className="font-bold text-sm">{tier.tier}</p>
                      <p className="text-xs text-primary font-mono font-semibold my-1">{tier.amount} $CRITTERS</p>
                      <p className="text-xs text-muted-foreground leading-relaxed">{tier.perks}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-muted/30">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-start gap-3">
                  <Zap className="w-4 h-4 text-accent mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    <strong className="text-foreground">On the roadmap:</strong>{" "}
                    On-chain deposit verification via Supabase Edge Function, treasury wallet setup,
                    token-gated tournaments, and $CRITTERS-denominated marketplace listings.
                    Economy mechanics roll out progressively with the community.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

        </div>
      </div>
      <Footer />
    </div>
  );
};

export default Bank;
