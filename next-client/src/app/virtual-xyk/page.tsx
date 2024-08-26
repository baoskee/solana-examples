"use client";
import { anchorProvider } from "@/lib/util";
import { BN, Program } from "@coral-xyz/anchor";
import { ASSOCIATED_TOKEN_PROGRAM_ID, createAssociatedTokenAccountIdempotent, createAssociatedTokenAccountIdempotentInstruction, getAssociatedTokenAddressSync, NATIVE_MINT, NATIVE_MINT_2022, TOKEN_2022_PROGRAM_ID, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { Keypair, LAMPORTS_PER_SOL, PublicKey, SystemProgram, Transaction } from "@solana/web3.js";
import { useQuery } from "@tanstack/react-query";
import { VirtualXyk, virtualXykIDL } from "anchor-local";
import { useCallback, useState } from "react";


const DEFAULT_MINT = "9ghqnUr3woUSpCihs63vVNQmBTyeNGro1FqVsAhDvXfE";

export default function VirtualXykPage() {

  const [mint, setMint] = useState<string>(DEFAULT_MINT);
  const contractState = useQuery({
    queryKey: ["contractState"],
    queryFn: async () => {
      try {
        if (!mint) return;

        const p = await program();
        const [curveAddress] = PublicKey.findProgramAddressSync(
          [Buffer.from("curve"), new PublicKey(mint).toBuffer()],
          p.programId
        );
        const curve = await p.account.curve.fetch(curveAddress);

        return {
          tokenAmount: formatLamports(curve.tokenAmount),
          fundingAmount: formatLamports(curve.fundingAmount),
          virtualFundingAmount: formatLamports(curve.virtualFundingAmount),
          tokenMint: curve.tokenMint.toBase58(),
          fundingMint: curve.fundingMint.toBase58(),
          fundingFeeAmount: formatLamports(curve.fundingFeeAmount),
          feeAuthority: curve.feeAuthority.toBase58(),
          bump: curve.bump
        };
      } catch (e) {
        console.error(e);
        return null;
      }
    },
    enabled: !!mint,
  })

  const initializeCurve = useCallback(async () => {
    const p = await program();
    if (!p.provider.publicKey) return;

    const newMint = new Keypair();
    const [curve] = PublicKey.findProgramAddressSync(
      [Buffer.from("curve"), newMint.publicKey.toBuffer()],
      p.programId
    )

    const tokenVaultAccount = getAssociatedTokenAddressSync(
      newMint.publicKey,
      curve,
      true,
      TOKEN_2022_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID
    );
    const signature = await p.methods.initialize(
      "New launch token",
      "NEW",
      "https://example.com",
      // set it at 50 SOL
      new BN(50 * LAMPORTS_PER_SOL)
    )
      .accounts({
        signer: p.provider.publicKey,
        feeAuthority: p.provider.publicKey,
        tokenMint: newMint.publicKey,
        fundingMint: NATIVE_MINT, // solana mint

        // @ts-ignore
        tokenVault: tokenVaultAccount,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      })
      .signers([newMint])
      .rpc();

    console.log(signature);
    setMint(newMint.publicKey.toBase58());

    contractState.refetch();
  }, [contractState])

  return <div className="flex flex-col gap-4">
    <h1>VirtualXykPage</h1>
    <p>
      Current Mint for new token: {mint}
    </p>
    <pre className="text-xs">{JSON.stringify(contractState.data, null, 2)}</pre>
    <button onClick={initializeCurve}>
      Launch token
    </button>

  </div>;
}

const program = async () => {
  const provider = await anchorProvider();
  const program = new Program<VirtualXyk>(
    // @ts-ignore
    virtualXykIDL,
    provider
  );

  return program;
}

function formatLamports(lamports: BN): string {
  const lamportsString = lamports.toString();
  const decimalIndex = lamportsString.length - 9;
  if (decimalIndex <= 0) {
    return "0." + lamportsString.padStart(9, "0");
  }
  return lamportsString.slice(0, decimalIndex) + "." + lamportsString.slice(decimalIndex);
}