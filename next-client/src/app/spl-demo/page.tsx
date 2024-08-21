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
  getTokenMetadata,
  getAccount,
  createAssociatedTokenAccountIdempotentInstruction,
  createSyncNativeInstruction
} from "@solana/spl-token";
import * as anchor from "@coral-xyz/anchor";
import { Keypair, LAMPORTS_PER_SOL, PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY, Transaction } from "@solana/web3.js";
import { MPL_TOKEN_METADATA_PROGRAM_ID } from "@metaplex-foundation/mpl-token-metadata";
import { useQuery } from "@tanstack/react-query";

// address of the funding mint
const FUNDING_MINT = NATIVE_MINT;
const METADATA_PROGRAM_ID = new PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s");

const MINT_A_DEFAULT = "GP3kMu8caqH6QZXMwpekCoyBY2WAGjK89Pjit8jRebZn"
/**
 * - Create token and specify funding mint
 */
export default function SPLDemo() {

  const [mintAAddr, setMintA] = useState<string>(MINT_A_DEFAULT);

  /**
   * Currently does not work. We're going to migrate to Token 2022 
   * once we figure out how it works. 
   */
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
  const mintAAmountLeft = useQuery({
    queryKey: ["mintAAmountLeft", mintAAddr],
    queryFn: async () => {
      try {
        const p = await program();
        const [stateAddr] = PublicKey.findProgramAddressSync(
          [Buffer.from("state"), new PublicKey(mintAAddr).toBuffer()],
          p.programId
        );

        const vaultAAddr = await getAssociatedTokenAddress(
          new PublicKey(mintAAddr),
          stateAddr,
          true, // owner is off-curve
          TOKEN_PROGRAM_ID
        );
        const account = await getAccount(p.provider.connection, vaultAAddr)
        // note mintA is precision 9 in contract 
        return (account.amount / BigInt(LAMPORTS_PER_SOL)).toString();
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
    mintAAmountLeft.refetch();
  }, [mintAMetadata, mintAAmountLeft])

  // 1. send SOL to WSOL ATA for automatic wrapping
  // 2. create idempotent ATA for all necessary accounts in instruction
  // 3. compose `redeem` instruction  
  // 4. compose and send transaction  
  const redeemTokens = useCallback(async () => {
    if (!mintAAddr) return;
    try {
      const p = await program();
      if (!p.provider.publicKey) throw new Error("provider public key is undefined");
      const [state] = PublicKey.findProgramAddressSync(
        [Buffer.from("state"), new PublicKey(mintAAddr).toBuffer()],
        p.programId
      );
      const reedemAmount = new anchor.BN(100e9); // redeem 100 tokens

      // 1. wrapped SOL instruction
      const wrappedSOLata = await getAssociatedTokenAddress(
        NATIVE_MINT,
        p.provider.publicKey,
        true,
        TOKEN_PROGRAM_ID
      );
      const createWSolAta = createAssociatedTokenAccountIdempotentInstruction(
        p.provider.publicKey,
        wrappedSOLata,
        p.provider.publicKey,
        NATIVE_MINT
      );

      // 2. create ATAs for all necessary accounts
      const vaultA =
        await getAssociatedTokenAddress(new PublicKey(mintAAddr), state, true, TOKEN_PROGRAM_ID);

      console.log(vaultA.toBase58())
      console.log(
        PublicKey.findProgramAddressSync(
          [
            state.toBuffer(),
            TOKEN_PROGRAM_ID.toBuffer(),
            new PublicKey(mintAAddr).toBuffer(),
          ],
          ASSOCIATED_TOKEN_PROGRAM_ID
        )[0].toBase58());

      const createVaultA = createAssociatedTokenAccountIdempotentInstruction(
        p.provider.publicKey,
        vaultA,
        state, // owner
        new PublicKey(mintAAddr), // mint
      )

      const vaultB = await getAssociatedTokenAddress(NATIVE_MINT, state, true, TOKEN_PROGRAM_ID);
      const createVaultB = createAssociatedTokenAccountIdempotentInstruction(
        p.provider.publicKey,
        vaultB,
        state, // owner
        NATIVE_MINT, // mint
      );
      const createPayerAtaA = createAssociatedTokenAccountIdempotentInstruction(
        p.provider.publicKey,
        await getAssociatedTokenAddress(
          new PublicKey(mintAAddr), 
          p.provider.publicKey, 
          true
        ),
        p.provider.publicKey, // owner
        new PublicKey(mintAAddr), // mint
      )

      // 3. compose redeem instruction
      const redeemInst = await p.methods.redeem(
        reedemAmount
      ).accounts({
        payer: p.provider.publicKey,
        // @ts-expect-error
        mintA: new PublicKey(mintAAddr),
        mintB: new PublicKey(NATIVE_MINT),
        state,
      }).instruction();
      const allInstructions = [
        createWSolAta,
        SystemProgram.transfer({
          fromPubkey: p.provider.publicKey,
          toPubkey: wrappedSOLata,
          lamports: reedemAmount.toNumber(),
        }),
        createSyncNativeInstruction(wrappedSOLata),
        createVaultA,
        createVaultB,
        createPayerAtaA,
        redeemInst
      ];
      const transaction = new Transaction().add(...allInstructions);

      const signature = await p.provider.sendAndConfirm!(transaction);
      console.log(signature);
      mintAAmountLeft.refetch();
    } catch (e) {
      console.error(e);
    }
  }, [mintAAddr, mintAAmountLeft])

  return (<div className="flex flex-col gap-4">
    <h1> SPL Demo </h1>
    <p>
      Mint A: {mintAAddr}
    </p>
    {mintAAmountLeft.data && (
      <p>
        Mint A amount left: {mintAAmountLeft.data}
      </p>
    )}
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
    <button onClick={redeemTokens}>
      Redeem 100 MintA tokens
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