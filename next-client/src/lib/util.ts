import { Wallet } from "@coral-xyz/anchor";
import { Connection, PublicKey, Transaction } from "@solana/web3.js";

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

export const connectAnchorWallet = async (): Promise<Wallet> => {
  const provider = getProvider();
  await provider.connect();

  // @ts-ignore
  return provider;
}

type SolanaProvider = {
  publicKey: PublicKey
  connect: () => Promise<void>
  signTransaction: (transaction: Transaction) => Promise<Transaction>
  signAllTransactions: (transactions: Transaction[]) => Promise<Transaction[]>
}

export const signAndBroadcast = async (
  connection: Connection,
  provider: SolanaProvider,
  transaction: Transaction
) => {
  const latestBlockhash = await connection.getLatestBlockhash();
  transaction.recentBlockhash = latestBlockhash.blockhash;
  transaction.feePayer = provider.publicKey;

  const signed = await provider.signTransaction(transaction);
  const signature = await connection.sendRawTransaction(signed.serialize());
  const confirmation = await connection.confirmTransaction(signature);

  return confirmation;
}

export const LOCAL_RPC_URL = "http://127.0.0.1:8899"
