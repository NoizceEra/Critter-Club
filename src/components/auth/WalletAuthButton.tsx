import { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Wallet, ArrowLeft } from 'lucide-react';
import { deriveWalletCredentials, shortenAddress } from '@/lib/walletAuth';

type Step = 'idle' | 'needs-username';

export const WalletAuthButton = () => {
  const { publicKey, signMessage, connected } = useWallet();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<Step>('idle');
  const [username, setUsername] = useState('');
  const [pendingCreds, setPendingCreds] = useState<{ email: string; password: string } | null>(null);

  const handleAuthenticate = async () => {
    if (!publicKey || !signMessage) {
      toast.error('Wallet not ready — please try reconnecting.');
      return;
    }
    setLoading(true);
    try {
      const { email, password } = await deriveWalletCredentials(publicKey, signMessage);

      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });

      if (!signInError) {
        toast.success('Welcome back!');
        navigate('/dashboard');
        return;
      }

      // New wallet — needs registration
      if (signInError.message.includes('Invalid login credentials')) {
        setPendingCreds({ email, password });
        setStep('needs-username');
        return;
      }

      throw signInError;
    } catch (err: any) {
      toast.error(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!pendingCreds || !username.trim() || !publicKey) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: pendingCreds.email,
        password: pendingCreds.password,
      });
      if (error) throw error;

      if (data.user) {
        const { error: profileError } = await supabase.from('profiles').insert([
          {
            id: data.user.id,
            username: username.trim(),
            pet_points: 100,
            wallet_address: publicKey.toBase58(),
          },
        ]);
        if (profileError) throw profileError;
      }

      toast.success(`Welcome to Critter Club, ${username.trim()}!`);
      navigate('/dashboard');
    } catch (err: any) {
      toast.error(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const resetStep = () => {
    setStep('idle');
    setPendingCreds(null);
    setUsername('');
  };

  // Step 2: new wallet — collect a username
  if (step === 'needs-username') {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 p-2 rounded-lg bg-primary/5 border border-primary/20">
          <Wallet className="w-4 h-4 text-primary flex-shrink-0" />
          <span className="text-xs font-mono text-muted-foreground">
            {shortenAddress(publicKey!.toBase58())}
          </span>
          <span className="text-xs text-primary ml-auto">New wallet</span>
        </div>
        <div className="space-y-2">
          <Label htmlFor="wallet-username">Choose a username</Label>
          <Input
            id="wallet-username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Pick a username"
            maxLength={20}
            onKeyDown={(e) => e.key === 'Enter' && handleRegister()}
            autoFocus
          />
        </div>
        <Button
          onClick={handleRegister}
          disabled={!username.trim() || loading}
          className="w-full shadow-button"
        >
          {loading ? 'Creating account...' : 'Create Critter Club Account'}
        </Button>
        <button
          type="button"
          onClick={resetStep}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors mx-auto"
        >
          <ArrowLeft className="w-3 h-3" />
          Back
        </button>
      </div>
    );
  }

  // Wallet connected — authenticate
  if (connected && publicKey) {
    return (
      <Button
        onClick={handleAuthenticate}
        disabled={loading}
        variant="outline"
        className="w-full border-primary/40 hover:border-primary hover:bg-primary/5"
      >
        <Wallet className="w-4 h-4 mr-2 text-primary" />
        {loading
          ? 'Authenticating...'
          : `Continue as ${shortenAddress(publicKey.toBase58())}`}
      </Button>
    );
  }

  // No wallet — show adapter connect button, styled to match the rest of the form
  return (
    <div className="w-full [&>button]:!w-full [&>button]:!justify-center [&>button]:!h-10 [&>button]:!text-sm [&>button]:!font-medium [&>button]:!rounded-md [&>button]:!bg-background [&>button]:!border [&>button]:!border-input [&>button]:!text-foreground [&>button]:hover:!bg-muted">
      <WalletMultiButton />
    </div>
  );
};
