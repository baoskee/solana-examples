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
import { getProvider, signAndBroadcast } from "../lib/util";
import { createAssociatedTokenAccountInstruction, createInitializeMint2Instruction, createMintToCheckedInstruction, getAccount, getAssociatedTokenAddress, getMinimumBalanceForRentExemptMint, getMint, MINT_SIZE, TOKEN_2022_PROGRAM_ID } from "@solana/spl-token";
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


  const tokenAccount = useQuery({
    queryKey: ['tokenAccount', mint],
    queryFn: async () => {
      if (!mint) return;
      const provider = getProvider();
      await provider.connect();
      const ata = await getAssociatedTokenAddress(
        new PublicKey(mint), // mint
        provider.publicKey, // token account owner
        true,
        TOKEN_2022_PROGRAM_ID
      );

      const conn = new Connection(LOCAL_RPC_URL);
      return await getAccount(conn, ata, undefined, TOKEN_2022_PROGRAM_ID); 
    },
    enabled: !!mint,
  })
  const tokenAcccountBalance = useQuery({
    queryKey: ['tokenAcccountBalance', mint],
    queryFn: async () => {
      const conn = new Connection(LOCAL_RPC_URL);
      return await conn.getTokenAccountBalance(
        tokenAccount.data!.address
      );
    },
    enabled: !!mint && !!tokenAccount.data,
  });
  const createTokenAccount = useCallback(async () => {
    if (!mint) return;

    const connection = new Connection(LOCAL_RPC_URL);
    const provider = getProvider();
    await provider.connect();
    const ata = await getAssociatedTokenAddress(
      new PublicKey(mint), // mint
      provider.publicKey, // token account owner
      true,
      TOKEN_2022_PROGRAM_ID
    );
    const transaction = new Transaction().add(
      createAssociatedTokenAccountInstruction(
        provider.publicKey,
        ata,
        provider.publicKey,
        new PublicKey(mint),
        TOKEN_2022_PROGRAM_ID
      )
    );
    const res = await signAndBroadcast(connection, provider, transaction);
    console.log('res', res);

    tokenAccount.refetch();
  }, [mint, tokenAccount]);

  const mintTokens = useCallback(async () => {
    if (!mint) return;
    const provider = getProvider();
    await provider.connect();

    const connection = new Connection(LOCAL_RPC_URL);
    const tx = new Transaction().add(
      createMintToCheckedInstruction(
        new PublicKey(mint),
        tokenAccount.data!.address, // receiver
        provider.publicKey, // mint authority
        1e8,
        8,
        [],
        TOKEN_2022_PROGRAM_ID
      )
    );

    const res = await signAndBroadcast(connection, provider, tx);
    console.log('res', res);
    tokenAcccountBalance.refetch();
  }, [mint, tokenAccount.data, tokenAcccountBalance]);

  return <div className="h-screen w-screen items-center justify-center flex flex-col gap-2">
    {mint && <div>
      <p>Mint address: {mint}</p>
      <div>Mint account: <pre className="text-xs">{stringifyBigInt(mintAccount)}</pre></div>
      <div>Token account: <pre className="text-xs">{stringifyBigInt(tokenAccount.data)}</pre></div>
      <div>Token account balance: {tokenAcccountBalance?.data?.value.uiAmount}</div>
  
    </div>}
    {tokenAccount.data && <button onClick={mintTokens}>
      Mint 1000 tokens to wallet
    </button>}
    {mint && <button onClick={createTokenAccount}>
      Create new token account
    </button>}
    <button onClick={createTokenMintAccount}>
      Create new token mint account
    </button>
  </div>
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const stringifyBigInt = (obj: any) => {
  return JSON.stringify(obj, (_, value) =>
    typeof value === 'bigint' ? value.toString() : value, 2);
};



export default App
