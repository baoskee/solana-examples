"use client"

import { anchorProvider } from "@/lib/util";
import { Program } from "@coral-xyz/anchor";
import { getTokenMetadata, TOKEN_2022_PROGRAM_ID } from "@solana/spl-token";
import { Keypair, PublicKey, SystemProgram } from "@solana/web3.js";
import { useQuery } from "@tanstack/react-query";
import { Token2022, token2022IDL } from "anchor-local";
import { useCallback, useState } from "react";

const DEFAULT_MINT = "FuvmeVQtYvyxbP9P6G8NJkhtgPcdLZhM1TpFEZdvANxw"

export default function Token2022Page() {
  const [mint, setMint] = useState<string>(DEFAULT_MINT)
  const tokenMetadata = useQuery({
    queryKey: ["token-metadata"],
    queryFn: async () => {
      const p = await program()

      const metadata = await getTokenMetadata(
        p.provider.connection, 
        new PublicKey(mint!),
      )
      return metadata
    },
    enabled: !!mint,
  });

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

    setMint(_mint.publicKey.toString())
    tokenMetadata.refetch()
  }, [tokenMetadata]);

  return (
    <div className="flex flex-col gap-4">
      <h1>Token2022Page</h1>
      <div>
        <p>Token mint: {mint}</p>
        <div>
          <div>Token metadata: <pre>
            {JSON.stringify(tokenMetadata.data, null, 2)}
            </pre>
          </div>
          </div>
      </div>
      <button onClick={createToken}>
        Create Token
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