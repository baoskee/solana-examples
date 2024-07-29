import { useCallback, useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import { Connection, Keypair, PublicKey, SystemProgram, Transaction, TransactionInstruction } from '@solana/web3.js';
import { useQuery } from '@tanstack/react-query';
import { Buffer } from 'buffer';
import * as borsh from 'borsh';

const LOCAL_RPC_URL = "http://127.0.0.1:8899"

// Change this to the program id of the counter program you deployed
const COUNTER_PROGRAM_ID = "2cKLoe4iAnBjDWb31oJ9eggLpPW3qCLr8dQ9LdKB7719"

function App() {
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

  const incrementCounter = useCallback(async () => {
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
    const increment = new Uint8Array(4);
    new DataView(increment.buffer).setUint32(0, 1, true);

    const incrememtInst = new TransactionInstruction({
      keys: [
        { pubkey: counterAccount.publicKey, isSigner: false, isWritable: true },
        { pubkey: programId, isSigner: false, isWritable: false },
      ],
      programId: programId,
      data: Buffer.from(increment),
    })

    const transaction = new Transaction().add(createCounterAccountInst, incrememtInst);
    transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
    transaction.feePayer = provider.publicKey;
    try {
      const signed = await provider.signTransaction(transaction);
      const signature = await connection.sendRawTransaction(signed.serialize());
      const confirmation = await connection.confirmTransaction(signature);
      console.log("Confirmation:", confirmation);
    } catch (err) {
      console.log("Error:", err);
    }

  // Fetch and display the updated counter value
  const accountInfo = await connection.getAccountInfo(counterAccount.publicKey);
  console.log("Account info:", accountInfo);
  if (!accountInfo) {
    console.log("Account not found");
    return;
  }
  const counterData = borsh.deserialize(
    CounterSchema,
    Counter,
    accountInfo.data
  );

  console.log('Updated counter value:', counterData?.count);
  }, [])

  return (
    <>
      <div>
        <a href="https://vitejs.dev" target="_blank">
          <img src={viteLogo} className="logo" alt="Vite logo" />
        </a>
        <a href="https://react.dev" target="_blank">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
      </div>
      <h1>Vite + React</h1>
      <div className="card">
        <p>
          SOL Balance: {solBalance}
        </p>
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
          <button onClick={incrementCounter}>
            Create account and increment counter
          </button>
        </div>
        <p>
          Edit <code>src/App.tsx</code> and save to test HMR
        </p>
      </div>
      <p className="read-the-docs">
        Click on the Vite and React logos to learn more
      </p>
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

const CounterSchema = new Map([
  [Counter, { kind: "struct", fields: [["count", "u64"]] }]
])

export default App
