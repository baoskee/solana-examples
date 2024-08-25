"use client";
import { anchorProvider } from "@/lib/util";
import { BN, Program } from "@coral-xyz/anchor";
import { ASSOCIATED_TOKEN_PROGRAM_ID, createAssociatedTokenAccountIdempotent, getAssociatedTokenAddressSync, NATIVE_MINT, NATIVE_MINT_2022, TOKEN_2022_PROGRAM_ID, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { Keypair, LAMPORTS_PER_SOL, PublicKey, SystemProgram } from "@solana/web3.js";
import { useQuery } from "@tanstack/react-query";
import { VirtualXyk, virtualXykIDL } from "anchor-local";
import { useCallback, useState } from "react";

export default function VirtualXykPage() {

  const [mint, setMint] = useState<string>();
  const contractState = useQuery({
    queryKey: ["contractState", mint],
    queryFn: async () => {
      if (!mint) return;

      const p = await program();
      const curve = await p.account.curve.fetch(mint);

      return {
        tokenAmount: (curve.tokenAmount.toNumber() / LAMPORTS_PER_SOL).toString(),
        fundingAmount: (curve.fundingAmount.toNumber() / LAMPORTS_PER_SOL).toString(),
        virtualFundingAmount: (curve.virtualFundingAmount.toNumber() / LAMPORTS_PER_SOL).toString(),
        tokenMint: curve.tokenMint.toBase58(),
        fundingMint: curve.fundingMint.toBase58(),
        fundingFeeAmount: (curve.fundingFeeAmount.toNumber() / LAMPORTS_PER_SOL).toString(),
        feeAuthority: curve.feeAuthority.toBase58(),
        bump: curve.bump
      };
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
    )
    const fundingVaultAccount = getAssociatedTokenAddressSync(
      NATIVE_MINT,
      curve,
      true,
      TOKEN_PROGRAM_ID,
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
      fundingVault: fundingVaultAccount,
      tokenProgram: TOKEN_2022_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      fundingTokenProgram: TOKEN_PROGRAM_ID
    })
    .signers([newMint])
    .rpc();

    console.log(signature);
    setMint(newMint.publicKey.toBase58());
  }, [])

  return <div>
    <h1>VirtualXykPage</h1>
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
