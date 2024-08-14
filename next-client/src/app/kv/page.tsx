"use client";

import { anchorProvider } from "@/lib/util";
import { useQuery } from "@tanstack/react-query";
import { useCallback, useState } from "react";
import * as anchor from "@coral-xyz/anchor";
import { kvIDL, KvStore } from "anchor-local";

const storeID = 0;

export default function KVPage() {
  const [key, setKey] = useState<string>();
  const [value, setValue] = useState<string>();

  const storePubkey = useQuery({
    queryKey: ["store"],
    queryFn: async () => {
      const provider = await anchorProvider();
      return provider.publicKey.toBase58();
    },
  });

  // MARK: Query value
  const [queryKey, setQueryKey] = useState<string>();
  const [queryValue, setQueryValue] = useState<string>();
  const onGetClick = useCallback(async() => {
      if (!queryKey) return;

      const provider = await anchorProvider();
      const program = new anchor.Program<KvStore>(
        // @ts-expect-error
        kvIDL,
        provider
      );
      const pda = anchor.web3.PublicKey.findProgramAddressSync(
        [
          Buffer.from("kv_store", "utf8"),
          provider.publicKey.toBuffer(),
          new anchor.BN(storeID).toArrayLike(Buffer, "le", 8),
          Buffer.from(queryKey, "utf8"),
        ],
        program.programId
      );
      const all = await program.account.kvStore.all();
      console.log("all:", all.map((a) => a.publicKey.toBase58()));
      console.log("pda:", pda[0].toBase58());
      const store = await program.account.kvStore.fetch(pda[0]);
      setQueryValue(store.value);
  }, [queryKey]);

  // MARK: Set value
  const onSetClick = useCallback(async() => {
    if (!key || !value) return;

    const provider = await anchorProvider();
    const program = new anchor.Program<KvStore>(
      // @ts-expect-error
      kvIDL,
      provider
    );
 
    const signature = await program.methods.setValue(
      new anchor.BN(storeID),
      key,
      value
    ).rpc();

    await provider.connection.confirmTransaction(signature); 
    console.log("signature:", signature);
  }, [key, value])

  return <div>
    <div>
      <div>
        <p>Store id: {storeID}</p>
        <p>Store: {storePubkey.data}</p>
      </div>
    </div>
    <div className="flex flex-col gap-2">
      <input type="text"
        placeholder="query key"
        value={queryKey}
        onChange={(e) => setQueryKey(e.target.value)}
      />
      <button onClick={onGetClick}>Get</button>
      <div className="text-lg text-yellow-500">
        Result: {queryValue}
      </div>
    </div>

    <hr className="my-4 border-gray-300" />

    <div className="flex flex-col gap-2">
      <input type="text"
        placeholder="key"
        value={key}
        onChange={(e) => setKey(e.target.value)}
      />
      <input type="text"
        placeholder="value"
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
      <button onClick={onSetClick}>Set</button>
    </div>
  </div>
}
