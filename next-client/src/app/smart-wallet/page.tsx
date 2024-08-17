"use client"
import { useCallback, useMemo } from "react"
import * as anchor from "@coral-xyz/anchor"
import { anchorProvider } from "@/lib/util"
import { SmartWallet, smartWalletIDL } from "anchor-local"
import { useQuery } from "@tanstack/react-query"
import { LAMPORTS_PER_SOL, PublicKey, SystemProgram } from "@solana/web3.js"

export default function SmartWalletPage() {

  const smartWalletMeta = useQuery({
    queryKey: ["smart-wallet-metadata-addr"],
    queryFn: async () => {
      try {
        const provider = await anchorProvider();
        const program = new anchor.Program<SmartWallet>(
          // @ts-expect-error
          smartWalletIDL, provider);

        const [addr] = PublicKey.findProgramAddressSync(
          [provider.wallet.publicKey.toBuffer()],
          program.programId
        )
        const res = await program.account.walletMeta.fetchNullable(addr);
        console.log("authority", res);

        return addr;
      } catch (e) {
        console.error(e);
        return null;
      }
    }
  })

  const smartWalletAddr = useQuery({
    queryKey: ["smart-wallet-addr"],
    queryFn: async () => {
      if (!smartWalletMeta.data) return null;
      const p = await program();
      const [addr] = PublicKey.findProgramAddressSync(
        [smartWalletMeta.data.toBuffer()],
        p.programId
      )
      return addr;
    },
    enabled: !!smartWalletMeta.data
  })

  const smartWalletBalance = useQuery({
    queryKey: ["smart-wallet-balance"],
    queryFn: async () => {
      if (!smartWalletAddr.data) return null;

      const p = await program();
      const connection = p.provider.connection;
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
    smartWalletMeta.refetch();
  }, [smartWalletMeta])

  const sendFromSmartWallet = useCallback(async () => {
    if (!smartWalletMeta.data) return;
    const p = await program();
    if (!p.provider.publicKey) return;
    if (!smartWalletAddr.data) return;

    const SOL_TRANSFER_RECIPIENT = p.provider.publicKey;

    const solTransferData = SystemProgram.transfer({
      fromPubkey: smartWalletMeta.data,
      lamports: LAMPORTS_PER_SOL * 1,
      // back to authority, can change this to any other account
      toPubkey: SOL_TRANSFER_RECIPIENT,
    }).data;

    const res = await p.methods.execute(solTransferData)
      .accounts({
        // @ts-expect-error
        authority: p.provider.publicKey,
        walletMeta: smartWalletMeta.data,
        wallet: smartWalletAddr.data,
        // System program is responsible for SOL transfers
        instructionProgram: SystemProgram.programId,
      })
      .remainingAccounts([
        {
          pubkey: smartWalletAddr.data,
          isSigner: false,
          isWritable: true,
        },
        {
          // recipient of SOL transfer
          pubkey: SOL_TRANSFER_RECIPIENT,
          isSigner: false,
          isWritable: true,
        },
        {
          pubkey: SystemProgram.programId,
          isSigner: false,
          isWritable: false,
        },
      ])
      .rpc();

    smartWalletBalance.refetch();
    console.log(res);
  }, [smartWalletMeta, smartWalletAddr, smartWalletBalance])

  return <div>
    <div className="flex flex-col gap-2 pb-4">
      <h1 className="text-2xl font-bold">Smart wallet Demo</h1>
      <p>Smart wallet metadata address: {smartWalletMeta.data?.toBase58()}</p>
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

const program = async () => {
  const provider = await anchorProvider();
  const program = new anchor.Program<SmartWallet>(
    // @ts-expect-error
    smartWalletIDL, provider);

  return program;
}
