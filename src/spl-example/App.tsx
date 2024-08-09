import {
  Connection,
  Keypair,
  SystemProgram,
  Transaction,
} from "@solana/web3.js"

import "../index.css"
import { useCallback, useState } from "react"
import { LOCAL_RPC_URL } from "../lib/constants";
import { getProvider } from "../lib/util";
import { createInitializeMint2Instruction, getMinimumBalanceForRentExemptMint, MINT_SIZE, TOKEN_2022_PROGRAM_ID } from "@solana/spl-token";

function App() {
  const [mint, setMint] = useState<string | null>(null);

  const createTokenMintAccount = useCallback(async () => {
    const connection = new Connection(LOCAL_RPC_URL);
    const latestBlockhash = await connection.getLatestBlockhash();
    console.log('latestBlockhash', latestBlockhash);

    const provider = getProvider();
    if (!provider) 
      return alert('Please install Phantom wallet');

    await provider.connect();
    const mint = Keypair.generate();
    const lamports = await getMinimumBalanceForRentExemptMint(connection);
    const transaction = new Transaction().add(
        SystemProgram.createAccount({
            fromPubkey: provider.publicKey,
            newAccountPubkey: mint.publicKey,
            space: MINT_SIZE,
            lamports,
            programId: TOKEN_2022_PROGRAM_ID,
        }),
        createInitializeMint2Instruction(
          mint.publicKey, 
          8, 
          provider.publicKey, // mint authority
          provider.publicKey, // freeze authority
          TOKEN_2022_PROGRAM_ID
        )
    );

    transaction.recentBlockhash = latestBlockhash.blockhash;
    transaction.feePayer = provider.publicKey;
    transaction.sign(mint);
    const signed = await provider.signTransaction(transaction);
    const sig = await connection.sendRawTransaction(signed.serialize());
    const confirmation = await connection.confirmTransaction(sig);
    console.log("Confirmation:", confirmation);
    setMint(mint.publicKey.toString());
  }, []);

  return <div className="h-screen w-screen flex items-center justify-center">
    <div>
      <p>Mint address: {mint}</p>
    </div>
    <button onClick={createTokenMintAccount}>
      Create token mint account
    </button>
  </div>
}

export default App
