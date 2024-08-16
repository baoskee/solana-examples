"use client"
import { useCallback, useMemo } from "react"
import * as anchor from "@coral-xyz/anchor"
import { anchorProvider } from "@/lib/util"
import { SmartWallet, smartWalletIDL } from "anchor-local"
import { useQuery } from "@tanstack/react-query"
import { LAMPORTS_PER_SOL, PublicKey, SystemProgram } from "@solana/web3.js"

export default function SmartWalletPage() {

  const smartWalletAddr = useQuery({
    queryKey: ["smart-wallet-addr"],
    queryFn: async () => {
      const provider = await anchorProvider();
      const program = new anchor.Program<SmartWallet>(
        // @ts-expect-error
        smartWalletIDL, provider);

      const [addr] = PublicKey.findProgramAddressSync(
        [provider.wallet.publicKey.toBuffer()],
        program.programId
      )
      const res = await program.account.wallet.fetchNullable(addr);
      console.log("authority", res);

      return addr;
    }
  })

  const smartWalletBalance = useQuery({
    queryKey: ["smart-wallet-balance"],
    queryFn: async () => {
      if (!smartWalletAddr.data) {
        return null;
      }
      const provider = await anchorProvider();
      const connection = provider.connection;
      const balance = await connection.getBalance(smartWalletAddr.data);
      return balance / anchor.web3.LAMPORTS_PER_SOL;
    },
    enabled: !!smartWalletAddr.data
  })

  const createSmartWallet = useCallback(async () => {
    const provider = await anchorProvider();
    const program = new anchor.Program<SmartWallet>(
      // @ts-expect-error
      smartWalletIDL, provider);

    const res = await program.methods.initialize()
      .rpc();
    console.log(res);
    smartWalletAddr.refetch();
  }, [smartWalletAddr])

  const sendFromSmartWallet = useCallback(async () => {
    if (!smartWalletAddr.data) return;

    const provider = await anchorProvider();
    const program = new anchor.Program<SmartWallet>(
      // @ts-expect-error
      smartWalletIDL, provider);

    const solTransferData = SystemProgram.transfer({
      fromPubkey: smartWalletAddr.data,
      lamports: LAMPORTS_PER_SOL * 1,
      // back to authority, can change this to any other account
      toPubkey: provider.wallet.publicKey,
    }).data;

    const res = await program.methods.execute(solTransferData)
      .accounts({
        // System program is responsible for SOL transfers
        instructionProgram: SystemProgram.programId,
        // @ts-expect-error
        authority: provider.wallet.publicKey,
        wallet: smartWalletAddr.data,
      })
      .rpc();
    console.log(res);
  }, [smartWalletAddr])

  return <div>
    <div className="flex flex-col gap-2 pb-4">
      <h1 className="text-2xl font-bold">Smart wallet Demo</h1>
        <p>Smart wallet address: {smartWalletAddr.data?.toBase58()}</p>
        <p>Smart wallet balance: {smartWalletBalance.data} SOL</p>
    </div>
    <div className="flex flex-col gap-2">
      <button onClick={createSmartWallet}>
        Create smart wallet
      </button>
      <button onClick={sendFromSmartWallet}>
        Send (decrement) 1 SOL from smart wallet
      </button>
    </div>
  </div>
}
