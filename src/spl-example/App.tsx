import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
} from "@solana/web3.js"

import "../index.css"
import { useCallback, useState } from "react"
import { LOCAL_RPC_URL } from "../lib/constants";
import { getProvider } from "../lib/util";
import { createInitializeMint2Instruction, getMinimumBalanceForRentExemptMint, getMint, MINT_SIZE, TOKEN_2022_PROGRAM_ID } from "@solana/spl-token";
import { useQuery } from "@tanstack/react-query";

const DEFAULT_MINT = 'HRHCBGxwW7Qb6KU9GcnwR32vQ8wu5m1N8pzyqvaTcAq4';

function App() {
  const [mint, setMint] = useState<string | null>(DEFAULT_MINT);
  const { data: mintAccount, refetch: refetchMintAccount } = useQuery({
    queryKey: ['mintAccount', mint],
    queryFn: async () => {
      try {
        const connection = new Connection(LOCAL_RPC_URL);
        const res = await getMint(connection, new PublicKey(mint!),
          undefined,
          TOKEN_2022_PROGRAM_ID
        );
      console.log('res', res);
      return res;
      } catch (e) {
        console.error(e);
        return null;
      }
    },
    enabled: !!mint,
  });

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
    refetchMintAccount();
  }, [refetchMintAccount]);

  return <div className="h-screen w-screen items-center justify-center flex flex-col">
    {mint && <div>
      <p>Mint address: {mint}</p>
      <div>Mint account: <pre className="text-xs">{stringifyBigInt(mintAccount)}</pre></div>
    </div>}
    <button onClick={createTokenMintAccount}>
      Create token mint account
    </button>
  </div>
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const stringifyBigInt = (obj: any) => {
  return JSON.stringify(obj, (_, value) =>
    typeof value === 'bigint' ? value.toString() : value, 2);
};



export default App
