"use client";

import { anchorProvider, getProvider } from "@/lib/util";
import { Program } from "@coral-xyz/anchor";
import { splDemoIDL, SplDemo } from "anchor-local";
import { useCallback, useState } from "react";
import {
  NATIVE_MINT,
  TOKEN_2022_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
  getTokenMetadata
} from "@solana/spl-token";
import * as anchor from "@coral-xyz/anchor";
import { Keypair, PublicKey, SYSVAR_RENT_PUBKEY } from "@solana/web3.js";
import { MPL_TOKEN_METADATA_PROGRAM_ID } from "@metaplex-foundation/mpl-token-metadata";
import { useQuery } from "@tanstack/react-query";

// address of the funding mint
const FUNDING_MINT = NATIVE_MINT;
const METADATA_PROGRAM_ID = new PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s");

const MINT_A_DEFAULT = "2H8JywEZo9BFnUer7LzbYZsggLKUyESsZsjy89kb35hX"
/**
 * - Create token and specify funding mint
 */
export default function SPLDemo() {

  const [mintAAddr, setMintA] = useState<string>(MINT_A_DEFAULT);
  const mintAMetadata = useQuery({
    queryKey: ["mintAMetadata", mintAAddr],
    queryFn: async () => {
      console.log("fetching metadata for", mintAAddr);
      if (!mintAAddr) return;
      try {
        const p = await program();
        const res = await getTokenMetadata(
          p.provider.connection,
          new PublicKey(mintAAddr),
          undefined,
          TOKEN_PROGRAM_ID
        );
        console.log("got metadata", res);
        return res;
      } catch (e) {
        console.error(e);
      }
    },
    enabled: !!mintAAddr
  })
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
    setMintA(mintA.publicKey.toBase58());
    mintAMetadata.refetch();
  }, [mintAMetadata])

  return (<div className="flex flex-col gap-4">
    <h1> SPL Demo </h1>
    <p>
      Mint A: {mintAAddr}
    </p>
    {mintAMetadata.data && (
      <p>
        Mint A metadata:
        <pre>
          {JSON.stringify(mintAMetadata.data, null, 2)}
        </pre>
      </p>
    )}

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