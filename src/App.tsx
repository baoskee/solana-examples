import { useCallback, useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import { Connection, PublicKey, SystemProgram, Transaction } from '@solana/web3.js';
import { useQuery } from '@tanstack/react-query';


const LOCAL_RPC_URL = "http://127.0.0.1:8899"

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
    const provider = getProvider(); // see "Detecting the Provider"
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

export default App
