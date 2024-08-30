"use client";

import { anchorProvider } from "@/lib/util"
import { BN, Program } from "@coral-xyz/anchor";
import { Keypair, Transaction } from "@solana/web3.js";
import { useQuery } from "@tanstack/react-query";
import { Puppet, puppetIdl, PuppetMaster, puppetMasterIDL } from "anchor-local";
import { useCallback, useState } from "react";

export default function PuppetMasterPage() {

  const [puppet, setPuppet] = useState<Keypair>();
  const puppetData = useQuery({
    queryKey: ["puppet-data"],
    queryFn: async () => {
      if (!puppet) return;
      const p = await puppetProgram();
      const data = await p.account.data.fetch(puppet.publicKey);

      return data;
    }
  })
  const initializePuppet = useCallback(async () => {
    const puppet = new Keypair();
    const p = await puppetProgram();
    const sig = await p.methods.initialize().accounts({
      puppet: puppet.publicKey
    })
      .signers([puppet])
      .rpc();

    console.log(sig);

    setPuppet(puppet);
    puppetData.refetch();
  }, [puppetData])

  const setPuppetData = useCallback(async () => {
    if (!puppet) return;
    const p = await puppetMasterProgram();
    const _puppetProgram = await puppetProgram();
    const inst = await p.methods.pullStrings(
      new BN(10)
    )
      .accounts({
        puppet: puppet.publicKey,
        // @ts-ignore
        puppetProgram: _puppetProgram.programId
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
  }, [puppet, puppetData])

  return <div className="flex flex-col gap-4">
    <h1>Puppet master</h1>
    <p>
      Puppet: {puppet?.publicKey.toBase58()}
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

const puppetMasterProgram = async () => {
  const provider = await anchorProvider();
  return new Program<PuppetMaster>(
    // @ts-ignore
    puppetMasterIDL,
    provider
  )
}

const puppetProgram = async () => {
  const provider = await anchorProvider();
  return new Program<Puppet>(
    // @ts-ignore
    puppetIdl,
    provider
  )
}
