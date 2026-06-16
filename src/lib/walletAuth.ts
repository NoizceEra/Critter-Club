import { PublicKey } from '@solana/web3.js';

export const CRITTERS_TOKEN_MINT = '6vjQQTFQmYg6xummvLBJshY7Kkz7rrSkdDnd9dqSpump';

const AUTH_MESSAGE =
  'Authenticate to Critter Club\nThis signature proves wallet ownership and does not cost any SOL.';

/**
 * Derives a deterministic email + password pair from a wallet signature.
 * The same wallet always produces the same credentials because ed25519
 * signatures are deterministic given the same key + message.
 * The password is SHA-256 of the signature (64 hex chars, within bcrypt's 72-byte limit).
 */
export async function deriveWalletCredentials(
  publicKey: PublicKey,
  signMessage: (message: Uint8Array) => Promise<Uint8Array>
): Promise<{ email: string; password: string }> {
  const encoded = new TextEncoder().encode(AUTH_MESSAGE);
  const signature = await signMessage(encoded);

  const hashBuffer = await crypto.subtle.digest('SHA-256', signature);
  const password = Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  const pubkeyStr = publicKey.toBase58();
  const shortKey = `${pubkeyStr.slice(0, 6)}${pubkeyStr.slice(-6)}`;
  const email = `w_${shortKey}@critterclub.sol`;
  return { email, password };
}

export function shortenAddress(address: string, chars = 4): string {
  return `${address.slice(0, chars)}...${address.slice(-chars)}`;
}
