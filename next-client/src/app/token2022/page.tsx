"use client"

import { anchorProvider } from "@/lib/util";
import { BN, Program } from "@coral-xyz/anchor";
import { ASSOCIATED_TOKEN_PROGRAM_ID, createAssociatedTokenAccountIdempotent, createAssociatedTokenAccountIdempotentInstruction, getAccount, getAssociatedTokenAddress, getMint, getTokenMetadata, TOKEN_2022_PROGRAM_ID } from "@solana/spl-token";
import { Keypair, LAMPORTS_PER_SOL, PublicKey, SystemProgram, Transaction } from "@solana/web3.js";
import { useQuery } from "@tanstack/react-query";
import { Token2022, token2022IDL } from "anchor-local";
import { useCallback, useState } from "react";

const DEFAULT_MINT = "2MXzwUyacJQ6EoDZaDT13CCcMi1uDYdjgy56aoz3rXfT"

export default function Token2022Page() {
  const [mint, setMint] = useState<string>(DEFAULT_MINT)
  const tokenMetadata = useQuery({
    queryKey: ["token-metadata", mint],
    queryFn: async () => {
      try {
        console.log("mint: ", mint)
        const p = await program()

        const metadata = await getTokenMetadata(
          p.provider.connection,
          new PublicKey(mint!),
        )
        const mintInfo = await getMint(
          p.provider.connection,
          new PublicKey(mint!),
          undefined,
          TOKEN_2022_PROGRAM_ID,
        );
        console.log("mintInfo: ", mintInfo)

        return {
          ...metadata,
          mintAuthority: mintInfo.mintAuthority?.toBase58(),
        }
      } catch (e) {
        console.log("error: ", e)
      }
    },
  });

  const vaultBalance = useQuery({
    queryKey: ["vault-balance", mint],
    queryFn: async () => {
      const p = await program()
      const [vaultAddr] = PublicKey.findProgramAddressSync(
        [Buffer.from("vault"), (new PublicKey(mint)).toBuffer()],
        p.programId,
      );
      const account = await getAccount(
        p.provider.connection,
        vaultAddr,
        undefined,
        TOKEN_2022_PROGRAM_ID,
      );
      return Number(account.amount) / LAMPORTS_PER_SOL
    }
  })

  const walletTokenBalance = useQuery({
    queryKey: ["wallet-token-balance", mint],
    queryFn: async () => {
      const p = await program()
      const [tokenAddr] = PublicKey.findProgramAddressSync(
        [
          p.provider.publicKey!.toBuffer(),
          TOKEN_2022_PROGRAM_ID.toBuffer(),
          (new PublicKey(mint)).toBuffer(),
        ],
        ASSOCIATED_TOKEN_PROGRAM_ID,
      )

      const account = await getAccount(
        p.provider.connection,
        tokenAddr,
        undefined,
        TOKEN_2022_PROGRAM_ID,
      )
      return Number(account.amount) / LAMPORTS_PER_SOL
    }
  })

  const createToken = useCallback(async () => {
    const p = await program()
    const _mint = new Keypair();
    const sig = await p.methods.initialize(
      "test",
      "TEST",
      "https://example.com",
    ).accounts({
      signer: p.provider.publicKey,
      mint: _mint.publicKey,
      // @ts-ignore
      systemProgram: SystemProgram.programId,
      tokenProgram: TOKEN_2022_PROGRAM_ID,
    })
      .signers([_mint])
      .rpc()
    console.log("sig: ", sig)

    setMint(_mint.publicKey.toBase58())
    tokenMetadata.refetch()
  }, [tokenMetadata]);

  const mintToken = useCallback(async () => {
    if (!mint) return;
    const p = await program();
    const [vault] = PublicKey.findProgramAddressSync(
      [Buffer.from("vault"), (new PublicKey(mint)).toBuffer()],
      p.programId,
    );

    const sig = await p.methods.mintToken(new BN(100 * LAMPORTS_PER_SOL))
      .accounts({
        signer: p.provider.publicKey,
        mint: new PublicKey(mint),
        // @ts-ignore
        vault,
        // @ts-ignore
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
      })
      .rpc();
    console.log("sig: ", sig)
  }, [mint])

  const transferToken = useCallback(async () => {
    const p = await program()
    if (!p.provider.publicKey) return;
    if (!mint) return;
    const [vault] = PublicKey.findProgramAddressSync(
      [Buffer.from("vault"), (new PublicKey(mint)).toBuffer()],
      p.programId,
    )
    const [ata] = PublicKey.findProgramAddressSync(
      [p.provider.publicKey.toBuffer(), TOKEN_2022_PROGRAM_ID.toBuffer(), (new PublicKey(mint)).toBuffer()],
      ASSOCIATED_TOKEN_PROGRAM_ID,
    )
    console.log("ata: ", ata.toBase58())
    const ata2 = await getAssociatedTokenAddress(
      new PublicKey(mint),
      p.provider.publicKey,
      false,
      TOKEN_2022_PROGRAM_ID,
    )
    console.log("ata2: ", ata2.toBase58())
    const createToAta = await createAssociatedTokenAccountIdempotentInstruction(
      p.provider.publicKey,
      new PublicKey(ata),
      p.provider.publicKey,
      new PublicKey(mint),
      TOKEN_2022_PROGRAM_ID,
    );
    const transferInst = await p.methods.transferToken(new BN(1 * LAMPORTS_PER_SOL))
      .accounts({
        signer: p.provider.publicKey,
        mint: new PublicKey(mint),
        // @ts-ignore
        fromVault: vault,
        toAuthority: p.provider.publicKey,
        to: ata,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
      })
      .instruction()
    const sig = await p.provider.sendAndConfirm!(
      new Transaction().add(createToAta, transferInst)
    )

    console.log("sig: ", sig)
    vaultBalance.refetch()
    walletTokenBalance.refetch()
  }, [
    mint,
    vaultBalance,
    walletTokenBalance,
  ])

  return (
    <div className="flex flex-col gap-4">
      <h1>Token2022Page</h1>
      <div>
        <p>Token mint: {mint}</p>
        <div>
          <div>Token metadata: <pre>
            {JSON.stringify(tokenMetadata.data, (key, value) =>
              typeof value === 'bigint' ? value.toString() : value
            , 2)}
          </pre>
          </div>
        </div>
      </div>
      <div>
        <p>Vault balance: {vaultBalance.data}</p>
        <p>Wallet token balance: {walletTokenBalance.data}</p>
      </div>
      <button onClick={createToken}>
        Create Token
      </button>
      <button onClick={mintToken}>
        Mint 100 tokens
      </button>
      <button onClick={transferToken}>
        Transfer 1 token from vault to wallet
      </button>
    </div>
  );
}

const program = async () => {
  const provider = await anchorProvider();
  const p = new Program<Token2022>(
    // @ts-ignore
    token2022IDL,
    provider,
  )

  return p
}