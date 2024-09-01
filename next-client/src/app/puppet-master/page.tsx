"use client";
import { anchorProvider, connectAnchorWallet, LOCAL_RPC_URL, useAnchorProvider } from "@/lib/util"
import { BN, Program } from "@coral-xyz/anchor";
import { Connection, Keypair, PublicKey, SystemProgram, Transaction } from "@solana/web3.js";
import { useQuery } from "@tanstack/react-query";
import { Puppet, puppetIdl, PuppetMaster, puppetMasterIDL } from "anchor-local";
import { useCallback, useState } from "react";
import * as anchor from "@coral-xyz/anchor";

const DEFAULT_PUPPET_ACCOUNT = "ExKU65us4djfMT4Zxy2V5mrN1U4tp8X2vxSRw5Uc8N4M"

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
      signer: provider.publicKey,
      puppet: puppet.publicKey,
      // @ts-ignore
      systemProgram: SystemProgram.programId
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

    const [masterPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("pda"), provider.publicKey.toBuffer()],
      p.programId
    )
    const sysTransferInst = SystemProgram.transfer({
      fromPubkey: provider.publicKey,
      toPubkey: masterPda,
      lamports: 1_000_000_000 // fund PDA with 1 SOL
    })

    console.log(p.provider.connection)
    const inst = await p.methods.pullStrings(
      new BN(11)
    )
      .accounts({
        signer: provider.publicKey,
        puppet: puppet,
        // @ts-ignore
        pdaAccount: masterPda,
        puppetProgram: new PublicKey("5TBggU5sCesWSqkSc44xzKZwhM8FRT4KhTMXK1LoerJG")
      })
      .instruction();

    const tx = new Transaction().add(sysTransferInst, inst);
    tx.feePayer = p.provider.publicKey;
    const conn = new Connection(LOCAL_RPC_URL);
    const blockhash = await conn.getLatestBlockhash();
    console.log(blockhash);

    tx.recentBlockhash = blockhash.blockhash;
    tx.lastValidBlockHeight = blockhash.lastValidBlockHeight;

    const response = await p.provider.connection.simulateTransaction(tx);
    console.log('Simulation response:', response);
    const wallet = await connectAnchorWallet();
    const signed = await wallet.signTransaction(tx);
    const sig = await conn.sendRawTransaction(signed.serialize(), {
      // UNCOMMENT THIS LINE GETS BLOCKHASH NOT FOUND ERROR
      skipPreflight: true
    });
    console.log(sig);

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
