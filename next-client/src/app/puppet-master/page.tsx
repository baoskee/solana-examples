"use client";
import { anchorProvider, useAnchorProvider } from "@/lib/util"
import { BN, Program } from "@coral-xyz/anchor";
import { Keypair, PublicKey, Transaction } from "@solana/web3.js";
import { useQuery } from "@tanstack/react-query";
import { Puppet, puppetIdl, PuppetMaster, puppetMasterIDL } from "anchor-local";
import { useCallback, useState } from "react";
import * as anchor from "@coral-xyz/anchor";

const DEFAULT_PUPPET_ACCOUNT = "EYDtTjPetEpWzqx7MryNNNf5MhTr4QFYFXAJWRQHMaQy"

/**
 * There are issues with Anchor for using two programs in the same Page.
 * My guess is that `anchorProvider()` being called twice causes 
 * blockhash staleness issues.
 */
export default function PuppetMasterPage() {

  const [puppet, setPuppet] = useState<PublicKey>(new PublicKey(DEFAULT_PUPPET_ACCOUNT));
  const provider = useAnchorProvider();
  const puppetData = useQuery({
    queryKey: ["puppet-data"],
    queryFn: async () => {
      if (!puppet || !provider) return;
      const p = await puppetProgram(provider);
      const data = await p.account.data.fetch(puppet);

      return data;
    },
    enabled: !!provider
  })
  const initializePuppet = useCallback(async () => {
    if (!provider) return;

    const puppet = new Keypair();
    const p = await puppetProgram(provider);
    const sig = await p.methods.initialize().accounts({
      puppet: puppet.publicKey
    })
      .signers([puppet])
      .rpc();

    console.log(sig);

    setPuppet(puppet.publicKey);
    puppetData.refetch();
  }, [puppetData, provider])

  const setPuppetData = useCallback(async () => {
    if (!puppet || !provider) return;
    const p = await puppetMasterProgram(provider);
    const inst = await p.methods.pullStrings(
      new BN(11)
    )
      .accounts({
        puppet: puppet,
        // @ts-ignore
        puppetProgram: new PublicKey("5TBggU5sCesWSqkSc44xzKZwhM8FRT4KhTMXK1LoerJG")
      })
      .instruction();

    const tx = new Transaction().add(inst);

    tx.recentBlockhash = (await p.provider.connection.getLatestBlockhash("confirmed")).blockhash;
    console.log("blockhash:", tx.recentBlockhash);
    tx.feePayer = p.provider.publicKey;

    try {
      // ISSUE: Still getting "Blockhash not found" error
      const sig = await p.provider.sendAndConfirm!(tx, undefined, {
        maxRetries: 3
      });
      console.log(sig);
    } catch (e) {
      console.log(e);
      // @ts-ignore
      console.log(await e.getLogs());
    }

    puppetData.refetch();
  }, [puppet, puppetData, provider])

  return <div className="flex flex-col gap-4">
    <h1>Puppet master</h1>
    <p>
      Puppet: {puppet.toBase58()}
    </p>
    <p>
      Puppet data: {puppetData.data?.data.toString()}
    </p>
    <button onClick={initializePuppet}>
      Initialize puppet
    </button>
    <button onClick={setPuppetData}>
      Set puppet data
    </button>
  </div>
}

const puppetMasterProgram = async (provider: anchor.AnchorProvider) => {
  return new Program<PuppetMaster>(
    // @ts-ignore
    puppetMasterIDL,
    provider
  )
}

const puppetProgram = async (provider: anchor.AnchorProvider) => {
  return new Program<Puppet>(
    // @ts-ignore
    puppetIdl,
    provider
  )
}
