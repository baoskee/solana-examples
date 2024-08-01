import { Connection, Keypair } from "@solana/web3.js";
import { useCallback, useState } from "react";
import * as anchor from '@coral-xyz/anchor';
import { Program } from '@coral-xyz/anchor';
import { AnchorCounter } from "../../anchor-counter/target/types/anchor_counter"
import IDL from "../../anchor-counter/target/idl/anchor_counter.json"
import { useQuery } from "@tanstack/react-query";

const LOCAL_RPC_URL = "http://127.0.0.1:8899"
// const PROGRAM_ID = "8rK93pjtsMfxvLayRD8Ypa9YJCursWoCT7379KTJtzxb"

function App() {

  const [data_acc, set_data_acc] = useState<string>()
  const instantiateDataAccount = useCallback(async () => {
    const wallet = getProvider();
    await wallet.connect();
    const connection = new Connection(LOCAL_RPC_URL); 

    const provider = new anchor.AnchorProvider(connection, wallet, {});
    anchor.setProvider(provider);
    const program = new Program<AnchorCounter>(
      // @ts-expect-error no type
      IDL, 
      provider
    );
    const counter = Keypair.generate()
    const res = await program.methods.initialize(new anchor.BN(8)).accounts({
      counter: counter.publicKey,
      user: wallet.publicKey,
    })
    .signers([counter])
    .rpc()

    console.log(res)
    set_data_acc(counter.publicKey.toString())
  }, [set_data_acc])

  const counterValue = useQuery({
    queryKey: ["counterValue", data_acc],
    queryFn: async () => {
      const wallet = getProvider();
      const connection = new Connection(LOCAL_RPC_URL);
      const provider = new anchor.AnchorProvider(connection, wallet, {});
      const program = new Program<AnchorCounter>(
        // @ts-expect-error Yikes 
        IDL, provider);
      const counter = await program.account.counter.fetch(data_acc!)
      return counter.count.toNumber()
    },
    enabled: !!data_acc
  })

  const increment = useCallback(async () => {
    const wallet = getProvider();
    await wallet.connect();
    const connection = new Connection(LOCAL_RPC_URL);
    const provider = new anchor.AnchorProvider(connection, wallet, {});
    anchor.setProvider(provider);
    const program = new Program<AnchorCounter>(
      // @ts-expect-error Yikes 
      IDL, provider);
    await program.methods.increment().accounts({
      counter: data_acc!
    }).rpc()

    counterValue.refetch()
  }, [data_acc, counterValue])

  return <div className="h-screen w-screen">
    <div className="w-full h-full justify-center items-center flex flex-col gap-2">
      {data_acc ?
      <p>Data Account: {data_acc}</p>
      : <button onClick={instantiateDataAccount}>Instantiate Data Account</button>}
      <p>Counter Value: {counterValue.data}</p>
      {data_acc && <button onClick={increment}>Increment</button>}
    </div>
  </div>
}

export default App

const getProvider = () => {
  if ('phantom' in window) {
    // @ts-expect-error no  global window 
    const provider = window.phantom?.solana;

    if (provider?.isPhantom) {
      return provider;
    }
    alert('Please install Phantom wallet')
  }

  window.open('https://phantom.app/', '_blank');
};

