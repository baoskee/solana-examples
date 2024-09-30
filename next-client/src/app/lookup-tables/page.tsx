"use client";
import { anchorProvider } from "@/lib/util";
import { AddressLookupTableProgram, Connection, Keypair, PublicKey, SystemProgram, Transaction } from "@solana/web3.js";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

export default function LookupTableDemo() { 

  const [addr, set_addr] = useState<PublicKey | null>(null);

  const create_lookup_table = async () => {
    const connection = new Connection("http://localhost:8899");
    const slot = await connection.getSlot();

    const provider = await anchorProvider();
    if (!provider || !provider.publicKey) {
      return alert("Please connect wallet");
    }

    const [lookupTableInst, lookupTableAddress] = AddressLookupTableProgram.createLookupTable({
      authority: provider.publicKey,
      payer: provider.publicKey,
      recentSlot: slot
    });

    const example0 = Keypair.generate()
    const example1 = Keypair.generate()
    const example2 = Keypair.generate()
    console.log("lookup table address:", lookupTableAddress.toBase58());
    const extendInstruction = AddressLookupTableProgram.extendLookupTable({
      payer: provider.publicKey,
      authority: provider.publicKey,
      lookupTable: lookupTableAddress,
      addresses: [
        provider.publicKey,
        SystemProgram.programId,
        // list more `publicKey` addresses here
        example0.publicKey,
        example1.publicKey,
        example2.publicKey,
      ],
    });

    const tx = new Transaction().add(...[lookupTableInst, extendInstruction]);
    const sig = await provider.sendAndConfirm!(
      tx, [], { commitment: "processed" }
    );
    set_addr(lookupTableAddress);
    console.log(sig); 
  }

  const lookup_table_account = useQuery({
    queryKey: ["lookup_table_account", addr],
    queryFn: async () => {
      const connection = new Connection("http://localhost:8899", "processed");
      const res= await connection.getAddressLookupTable(addr!);
      return res.value;
    },
    enabled: !!addr,
  });
 
  return <div>
    <p className="py-2">
      Lookup table addr: {addr?.toBase58()}
    </p>
    <pre>
      {lookup_table_account.data && JSON.stringify(lookup_table_account.data, (key, value) =>
        typeof value === 'bigint' ? value.toString() : value
      , 2)}
    </pre>
    <button onClick={create_lookup_table}>
      Create Lookup Table
    </button>
  </div>
} 
