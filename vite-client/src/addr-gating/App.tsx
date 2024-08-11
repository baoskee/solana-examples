import { useQuery } from "@tanstack/react-query";
import { Connection, Keypair, PublicKey, SystemProgram, Transaction, TransactionInstruction } from "@solana/web3.js";
import { useCallback, useState } from "react";
import { BorshSchema, borshSerialize, borshDeserialize } from 'borsher';

const LOCAL_RPC_URL = "http://127.0.0.1:8899"
const PROGRAM_ID = "7VfV44AdkrFskByeVabzDxfeJxjUtA1nAFxdgoERSSJR";

const AUTHORIZED_ADDR = "HNc5mQKb5X7Agsk866kxM1yLv6dVDTPJnuPSsanGhrFo"

function App() {
  // MARK: - PDA cannot be created from client
  const pda_data_account = useQuery({
    queryKey: ["pda_data_account", PROGRAM_ID],
    queryFn: () => {
      const [pda, bump] = PublicKey.findProgramAddressSync([], new PublicKey(PROGRAM_ID));
      console.log("pda, bump", pda, bump);
      return pda;
    },
  });

  const [data_account, set_data_account] = useState<string>();
  const deployDataAccount = useCallback(async () => {
    if (!pda_data_account.data) return;
    const provider = getProvider();
    await provider.connect();
    if (!provider) return;

    const connection = new Connection(LOCAL_RPC_URL);
    const programId = new PublicKey(PROGRAM_ID);
    const counterKeypair = Keypair.generate();

    const createAccountInst = SystemProgram.createAccount({
      fromPubkey: provider.publicKey,
      newAccountPubkey: counterKeypair.publicKey,
      lamports: await connection.getMinimumBalanceForRentExemption(
        4 + 32
      ),
      programId,
      space: 4 + 32,
    });
    const instantiateInst = new TransactionInstruction({
      keys: [
        {
          pubkey: counterKeypair.publicKey,
          isSigner: false,
          isWritable: true,
        }
      ],
      programId,
      data: borshSerialize(instructionSchema, {
        Initialize: {
          address: new PublicKey(AUTHORIZED_ADDR).toBuffer() 
        }
      })
    })

    const tx = new Transaction().add(createAccountInst, instantiateInst);
    tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
    tx.feePayer = provider.publicKey;
    tx.partialSign(counterKeypair);
    try {
      const signed = await provider.signTransaction(tx);
      const signature = await connection.sendRawTransaction(signed.serialize());
      const confirmation = await connection.confirmTransaction(signature);
      console.log("Confirmation:", confirmation);
      set_data_account(counterKeypair.publicKey.toBase58());
    } catch (err) {
      console.log("Error:", err);
    }
  }, [
    set_data_account,
    pda_data_account.data,
  ]);

  const incrementDataAccount = useQuery({
    queryKey: ["increment_data_account", data_account],
    queryFn: async () => {
      if (!data_account) return;

      // get state of data account
      const connection = new Connection(LOCAL_RPC_URL);
      const accountInfo = await connection.getAccountInfo(new PublicKey(data_account));
      if (accountInfo === null) {
        throw new Error('Error: cannot find the counter account');
      } 

      const data: { count: number } = await borshDeserialize(stateSchema, accountInfo.data)
      return data.count as number
    },
    enabled: !!data_account
  })

  const increment = useCallback(async () => {
    if (!data_account) return;
    const provider = getProvider();
    await provider.connect();
    const connection = new Connection(LOCAL_RPC_URL);
    const programId = new PublicKey(PROGRAM_ID);
    const counterPubkey = new PublicKey(data_account);

    const instruction = new TransactionInstruction({
      keys: [
        {
          pubkey: counterPubkey,
          isSigner: false,
          isWritable: true,
        },
        // Authorized address
        {
          pubkey: new PublicKey(AUTHORIZED_ADDR),
          // toggle this to error
          // @todo for some reason, false does not error
          isSigner: false,
          isWritable: false,
        }
      ],
      programId,
      data: borshSerialize(instructionSchema, {
        Increment: {
          increment: 1
        }
      })
    });

    const tx = new Transaction().add(instruction);
    tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
    tx.feePayer = provider.publicKey;
    try {
      const signed = await provider.signTransaction(tx);
      const signature = await connection.sendRawTransaction(signed.serialize());
      const confirmation = await connection.confirmTransaction(signature);
      console.log("Confirmation:", confirmation);
      incrementDataAccount.refetch()
    } catch (err) {
      console.log("Error:", err);
    }
  }, [data_account, incrementDataAccount]);

  return (<div className="h-screen w-screen">
    <div className="flex w-full justify-center items-center h-full flex-col gap-2">

      {data_account ? <p>account exists on chain: {data_account}</p> : <button onClick={deployDataAccount}>Deploy data account</button>}
      {data_account &&
        <button onClick={increment}>Increment</button>
      }
      {incrementDataAccount.data && <p>count: {incrementDataAccount.data}</p>}
    </div>
  </div>)
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

const instructionSchema = BorshSchema.Enum({
  Initialize: BorshSchema.Struct({
    address: BorshSchema.Array(BorshSchema.u8, 32)
  }),
  Increment: BorshSchema.Struct({
    increment: BorshSchema.u32
  })
})

const stateSchema = BorshSchema.Struct({
  count: BorshSchema.u32,
  address: BorshSchema.Array(BorshSchema.u8, 32)
})
