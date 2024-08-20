"use client";

import { anchorProvider, getProvider } from "@/lib/util";
import { Program } from "@coral-xyz/anchor";
import { splDemoIDL, SplDemo } from "anchor-local";
import { useCallback } from "react";
import {
  NATIVE_MINT,
  TOKEN_2022_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress
} from "@solana/spl-token";
import * as anchor from "@coral-xyz/anchor";
import { Keypair, PublicKey, SYSVAR_RENT_PUBKEY } from "@solana/web3.js";
import { MPL_TOKEN_METADATA_PROGRAM_ID } from "@metaplex-foundation/mpl-token-metadata";

// address of the funding mint
const FUNDING_MINT = NATIVE_MINT;
const METADATA_PROGRAM_ID = new PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s");


/**
 * - Create token and specify funding mint
 */
export default function SPLDemo() {

  const launchToken = useCallback(async () => {
    const p = await program();
    const mintA = new Keypair();

    const [state] = PublicKey.findProgramAddressSync(
      [Buffer.from("state"), mintA.publicKey.toBuffer()],
      p.programId
    )
    const [metadataA] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("metadata"),
        METADATA_PROGRAM_ID.toBuffer(),
        mintA.publicKey.toBuffer(),
      ],
      METADATA_PROGRAM_ID
    );

    const sig = await p.methods.initialize(
      "Test Token",
      "TST",
      "https://example.com",
      new anchor.BN("1000000000000000000")
    ).accounts({
      payer: p.provider.publicKey,
      mintA: mintA.publicKey,
      mintBFunding: FUNDING_MINT,
      // @ts-expect-error
      metadataA, 
      state,
      tokenMetadataProgram: METADATA_PROGRAM_ID,
      tokenProgram: TOKEN_PROGRAM_ID,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      rent: SYSVAR_RENT_PUBKEY
    })
    .signers([mintA])
    .rpc();

    console.log(sig);

  }, [])

  return (<div>
    <h1> SPL Demo </h1>
    <button onClick={launchToken}>
      Launch token
    </button>
  </div>);
}

const program = async () => {
  const provider = await anchorProvider();
  const program = new Program<SplDemo>(
    // @ts-expect-error
    splDemoIDL, 
    provider
  );

  return program;
}