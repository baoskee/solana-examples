"use client"
import { useCallback, useState } from 'react'
import { Connection, Keypair, PublicKey, SystemProgram, Transaction, TransactionInstruction } from '@solana/web3.js';
import { useQuery } from '@tanstack/react-query';
import { Buffer } from 'buffer';

const LOCAL_RPC_URL = "http://127.0.0.1:8899"

// Change this to the program id of the counter program you deployed
const COUNTER_PROGRAM_ID = "2cKLoe4iAnBjDWb31oJ9eggLpPW3qCLr8dQ9LdKB7719"

// Should be owned by the program ID above, and allocated 4 bytes
// Change this to the counter account you created with Program ID deployed
const COUNTER_ACCOUNT = "HKc9q4rJVCUSnrYrFEGCYCG79iFdBcniyLFaJ5fC15Ce"

const CPI_PROGRAM_ID = "3keLrJBrHdo25govPxiNRmFUs5YmxvXQghCkdEmwCNFX"

export default function App() {
  const [count, setCount] = useState(0)
  const { data: provider } = useQuery({
    queryKey: ['provider'],
    queryFn: getProvider,
  });

  const fetchSolBalance = async () => {
    const provider = getProvider(); // see "Detecting the Provider"
    const connection = new Connection(LOCAL_RPC_URL)

    try {
      const resp = await provider.connect();
      console.log(resp.publicKey.toString());
      const publicKey = resp.publicKey;
      const balance = await connection.getBalance(publicKey);
      return balance / 1e9;
    } catch (err) {
      // { code: 4001, message: 'User rejected the request.' }
      throw new Error('Failed to fetch balance');
    }
  };

  const { data: solBalance, refetch } = useQuery({
    queryKey: ['solBalance', provider?.publicKey],
    queryFn: fetchSolBalance,
    enabled: !!provider,
  });

  const send1SOL = useCallback(async () => {
    const provider = getProvider();
    const targetPubkey = "73fCqk4vhrUH3V84Vqf4BMt6ngPhe6dccH5yN5AVwFWw";
    const connection = new Connection(LOCAL_RPC_URL)
    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: provider.publicKey,
        lamports: 1e9,
        toPubkey: new PublicKey(targetPubkey)
      })
    );

    transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
    transaction.feePayer = provider.publicKey;
    try {
      const signed = await provider.signTransaction(transaction);
      console.log("Signed:", signed);

      const signature = await connection.sendRawTransaction(signed.serialize());
      console.log("Signature:", signature);

      const confirmation = await connection.confirmTransaction(signature);
      console.log("Confirmation:", confirmation);

      refetch();
    } catch (err) {
      console.log("Error:", err);
    }
  }, [refetch])

  const deployCounterAccount = useCallback(async () => {
    const provider = getProvider();
    const connection = new Connection(LOCAL_RPC_URL);

    const programId = new PublicKey(COUNTER_PROGRAM_ID);
    // generate new account to store counter
    const counterAccount = Keypair.generate();
    console.log("Counter account:", counterAccount.publicKey.toString());

    // create counter account
    const createCounterAccountInst = SystemProgram.createAccount({
      fromPubkey: provider.publicKey,
      newAccountPubkey: counterAccount.publicKey,
      lamports: await connection.getMinimumBalanceForRentExemption(4), // 4 bytes for counter
      space: 4,
      programId: programId
    });

    const transaction = new Transaction().add(createCounterAccountInst);
    transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
    transaction.feePayer = provider.publicKey;
    // IMPORTANT: in Solana, you need signature of account you are creating as well as signer
    transaction.partialSign(counterAccount);
    try {
      const signed = await provider.signTransaction(transaction);
      const signature = await connection.sendRawTransaction(signed.serialize());
      const confirmation = await connection.confirmTransaction(signature);
      console.log("Confirmation:", confirmation);
    } catch (err) {
      console.log("Error:", err);
    }
  }, [])

  const { data: counterData, refetch: refetchCounterData } = useQuery({
    queryKey: ['counterData'],
    queryFn: async () => {
      const connection = new Connection(LOCAL_RPC_URL);
      const counterPubkey = new PublicKey(COUNTER_ACCOUNT);

      try {
        const accountInfo = await connection.getAccountInfo(counterPubkey);
        if (accountInfo === null) {
          throw new Error('Error: cannot find the counter account');
        }

        const counterData = new DataView(accountInfo.data.buffer).getUint32(0, true); // Little-endian
        console.log("Counter data:", counterData);
        return counterData;
      } catch (err) {
        console.log("Error:", err);
        throw new Error('Failed to fetch counter data');
      }
    },
  });

  const incrementCounter = useCallback(async () => {
    // Prepare the instruction data (increment by 1)
    const increment = new Uint8Array(4);
    const incrementAmount = 1;
    new DataView(increment.buffer).setUint32(0, incrementAmount, true); // Little-endian

    const counterPubkey = new PublicKey(COUNTER_ACCOUNT);
    const connection = new Connection(LOCAL_RPC_URL);

    // Create the instruction to increment the counter
    const incrementInstruction = new TransactionInstruction({
      keys: [{ pubkey: counterPubkey, isSigner: false, isWritable: true }],
      // only the owner, counter program ID, can update this account
      programId: new PublicKey(COUNTER_PROGRAM_ID),
      data: Buffer.from(increment),
    });

    const transaction = new Transaction().add(incrementInstruction);
    transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
    transaction.feePayer = provider.publicKey;
    try {
      const signed = await provider.signTransaction(transaction);
      const signature = await connection.sendRawTransaction(signed.serialize());
      const confirmation = await connection.confirmTransaction(signature);
      console.log("Confirmation:", confirmation);
      refetchCounterData();
    } catch (err) {
      console.log("Error:", err);
    }
  }, [provider, refetchCounterData])

  const cpiIncrementBy7 = useCallback(async () => {
    const provider = getProvider();
    const connection = new Connection(LOCAL_RPC_URL);

    const cpiExamplePubkey = new PublicKey(CPI_PROGRAM_ID);
    const counterPubkey = new PublicKey(COUNTER_ACCOUNT);
    const counterProgram = new PublicKey(COUNTER_PROGRAM_ID);  

    const cpiInstruction = new TransactionInstruction({
      keys: [
        // IMPORTANT: must include counter program account as first element
        { pubkey: counterPubkey, isSigner: false, isWritable: true },
        { pubkey: counterProgram, isSigner: false, isWritable: false },
      ],
      programId: cpiExamplePubkey,
      data: Buffer.from([])
    })

    const tx = new Transaction().add(cpiInstruction)
    tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
    tx.feePayer = provider.publicKey;
    try {
      const signed = await provider.signTransaction(tx);
      const signature = await connection.sendRawTransaction(signed.serialize());
      const confirmation = await connection.confirmTransaction(signature);
      console.log("Confirmation:", confirmation);
      refetchCounterData()
    } catch (err) {
      console.log("Error:", err);
    }
  }, [refetchCounterData])

  return (
    <>
      <div className="card">
        <div>
          <div>
            Counter account: {COUNTER_ACCOUNT}
          </div>
          <div>
            SOL Balance: {solBalance}
          </div>
          <div>
            Counter: {counterData}
          </div>
        </div>
        <div style={{
          display: 'flex',
          flexDirection: 'row',
          gap: '10px'
        }}>
          <button onClick={() => setCount((count) => count + 1)}>
            count is {count}
          </button>
          <button onClick={send1SOL}>
            Send 1 SOL
          </button>
          <button onClick={deployCounterAccount}>
            Deploy counter account
          </button>
          <button onClick={incrementCounter}>
            Increment counter
          </button>
          <button onClick={cpiIncrementBy7}>
            Call CPI contract (Increment by 7)
          </button>
        </div>
    
      </div>
    </>
  )
}

const getProvider = () => {
  if ('phantom' in window) {
    // @ts-expect-error no  global window 
    const provider = window.phantom?.solana;

    if (provider?.isPhantom) {
      return provider;
    }
    alert('Please install Phantom wallet')
  }

  window.open('https://phantom.app/', '_blank');
};

class Counter {
  count = 0;
  constructor(fields = undefined) {
    if (fields) {
      // @ts-expect-error no fields
      this.count = fields.count;
    }
  }
}

export const CounterSchema = new Map([
  [Counter, { kind: "struct", fields: [["count", "u64"]] }]
])
