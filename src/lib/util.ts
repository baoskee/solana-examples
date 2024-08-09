import { PublicKey, Transaction } from "@solana/web3.js";

export const getProvider = (): SolanaProvider => {
  if ('phantom' in window) {
    // @ts-expect-error no  global window 
    const provider = window.phantom?.solana;

    if (provider?.isPhantom) {
      return provider;
    }
    alert('Please install Phantom wallet')
  }

  window.open('https://phantom.app/', '_blank');
  throw new Error('Phantom wallet not found');
};

type SolanaProvider = {
  publicKey: PublicKey
  connect: () => Promise<void>
  signTransaction: (transaction: Transaction) => Promise<Transaction>
}