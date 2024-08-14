"use client"
import { anchorProvider } from "@/lib/util"
import { BN, Program } from "@coral-xyz/anchor";
import { useCallback } from "react"
import { pubkeyArgIDL, type PubkeyArg } from "anchor-local";
import { Keypair, PublicKey } from "@solana/web3.js";
import { useQuery } from "@tanstack/react-query";
import { SystemProgram } from "@solana/web3.js";


const PUBKEY_TO_SAVE = "GriAght9Mi9m3BTKvPUM6426axdGayqCuqczczJrykdi";

const pubkeyAccount = new Keypair();

export default function PubkeyArg() {

  const savedPubkey = useQuery({
    queryKey: ["savedPubkey"],
    queryFn: async () => {
      const provider = await anchorProvider();
      const program = new Program<PubkeyArg>(
        // @ts-expect-error
        pubkeyArgIDL,
        provider
      );

      const res = await program.account.pubkeyArg.fetch(pubkeyAccount.publicKey);
      return {
        ...res,
        idSeed: res.idSeed.toNumber(),
        tokenAAmount: res.tokenAAmount.toNumber(),
        tokenBAmount: res.tokenBAmount.toNumber(),
      }
    }
  })

  const savePubkey = useCallback(async () => {
    const provider = await anchorProvider();
    const program = new Program<PubkeyArg>(
      // @ts-expect-error
      pubkeyArgIDL,
      provider
    );

    const signature = await program.methods.initialize(
      new BN(1),
      new BN(2),
      new BN(3),
      new PublicKey(PUBKEY_TO_SAVE))
      .accounts({
        signer: provider.publicKey,
        pubkeyArg: pubkeyAccount.publicKey,
      })
      .signers([pubkeyAccount])
      .rpc();

    await provider.connection.confirmTransaction(signature);
    console.log("Signature", signature);
    savedPubkey.refetch();
  }, [savedPubkey])




  return <div>
    <div>
      <p>Saved pubkey:</p>
      <pre>{JSON.stringify(savedPubkey.data, null, 2)}</pre>
    </div>
    <button onClick={savePubkey}>
      Save Pubkey
    </button>
  </div>
}