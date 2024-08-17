"use client";
import * as anchor from "@coral-xyz/anchor";
import { anchorProvider } from "@/lib/util";
import { useCallback, useState } from "react";
import { cpiSignerIDL, type CpiSigner } from "anchor-local";
import { useQuery } from "@tanstack/react-query";
import { PublicKey, LAMPORTS_PER_SOL, SystemProgram } from "@solana/web3.js";

/**
 * Under the architecture, anyone can redeem
 * funds for the recipient by calling SOL transfer.
 */
export const RECIPIENT = new PublicKey("HNc5mQKb5X7Agsk866kxM1yLv6dVDTPJnuPSsanGhrFo")

/**
 * All accounts are System Accounts by default, 
 * and by transferring SOL to an account that we have derived 
 * from seed, we are effectively "initializing" it. 
 * 
 * We just need to ensure we are transferring enough funds to 
 * cover rent for a 0-byte account.
 */
export default function CpiSigner() {

  const pdaAddress = useQuery({
    queryKey: ["pda-address"],
    queryFn: async () => {
      const p = await program();
      const [pdaAddress] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("pda"),
          RECIPIENT.toBuffer(),
        ],
        p.programId,
      )
      return pdaAddress;
    }
  })

  const pdaBalance = useQuery({
    queryKey: ["pda-balance"],
    queryFn: async () => {
      if (!pdaAddress.data) return;

      const p = await program();
      const balance = await p.provider.connection.getBalance(pdaAddress.data);
      return balance;
    },
    enabled: !!pdaAddress.data,
  })

  // MARK: - Actions
  const [amount_sol, setAmountSol] = useState<number>();
  const redeemFunds = useCallback(async (amount_sol: number) => {
    if (!pdaAddress.data) return;

    const p = await program();
    const res = await p.methods.solTransfer(
      new anchor.BN(amount_sol * LAMPORTS_PER_SOL)
    )
      .accounts({
        recipient: RECIPIENT,
        // @ts-expect-error
        systemProgram: SystemProgram.programId,
        pdaAccount: pdaAddress.data,
      })
      .rpc();

    console.log(res);
    pdaBalance.refetch();
  }, [pdaAddress.data, pdaBalance])

  return <div>
    <h1 className="text-bold">CPI signer demo</h1>
    <div className="flex flex-col gap-2 py-4">
      <p>PDA address: {pdaAddress.data?.toBase58()}</p>
      <p>PDA balance: {pdaBalance.data ? (pdaBalance.data / LAMPORTS_PER_SOL).toFixed(2) : "Loading..."}</p>
      <input type="number"
        value={amount_sol}
        placeholder="Amount in SOL"
        onChange={(e) => setAmountSol(Number(e.target.value))}
      />
      <button onClick={() => amount_sol && redeemFunds(amount_sol)}>
        Redeem funds from PDA
      </button>
    </div>
  </div>
}

const program = async () => {
  const provider = await anchorProvider();
  const program = new anchor.Program<CpiSigner>(
    // @ts-expect-error
    cpiSignerIDL,
    provider,
  );
  return program;
}
