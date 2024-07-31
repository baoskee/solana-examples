import { useQuery } from "@tanstack/react-query";
import { Connection, Keypair, PublicKey, SystemProgram, Transaction, TransactionInstruction } from "@solana/web3.js";
import { useCallback, useState } from "react";
import * as borsh from "borsh";
import { Buffer } from "buffer";

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
  const pda_exists = useQuery({
    queryKey: ["pda_exists", pda_data_account.data],
    queryFn: async () => {
      const connection = new Connection(LOCAL_RPC_URL);
      const accountInfo = await connection.getAccountInfo(pda_data_account.data!);
      return accountInfo !== null;
    },
    enabled: !!pda_data_account.data,
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
      data: Buffer.from(borsh.serialize(
        // @ts-expect-error what 
        schema,
        Instruction.initialize(new PublicKey(AUTHORIZED_ADDR))
      ))
    })

    const tx = new Transaction().add(createAccountInst, instantiateInst);
    tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
    tx.feePayer = provider.publicKey;
    tx.partialSign(counterKeypair);
    set_data_account(counterKeypair.publicKey.toBase58());
    try {
      const signed = await provider.signTransaction(tx);
      const signature = await connection.sendRawTransaction(signed.serialize());
      const confirmation = await connection.confirmTransaction(signature);
      console.log("Confirmation:", confirmation);
      pda_exists.refetch();
    } catch (err) {
      console.log("Error:", err);
    }
  }, [
    pda_exists,
    pda_data_account.data,
  ]);

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
        }
      ],
      programId,
      data: Buffer.from(borsh.serialize(
        // @ts-expect-error what 
        schema,
        Instruction.increment(1)
      ))
    });

    const tx = new Transaction().add(instruction);
    try {
      const signed = await provider.signTransaction(tx);
      const signature = await connection.sendRawTransaction(signed.serialize());
      const confirmation = await connection.confirmTransaction(signature);
      console.log("Confirmation:", confirmation);
    } catch (err) {
      console.log("Error:", err);
    }
  }, [data_account]);

  return (<div className="h-screen w-screen">
    <div className="flex w-full justify-center items-center h-full">

      {data_account ? <p>account exists on chain: {data_account}</p> : <button onClick={deployDataAccount}>Deploy data account</button>}
      {data_account &&
        <button onClick={increment}>Increment</button>
      }

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

// Define the instruction enum structure
enum InstructionType {
  Initialize,
  Increment,
}

class Instruction {
  static initialize(address: PublicKey): InitializeInstruction {
    return new InitializeInstruction(address);
  }

  static increment(increment: number): IncrementInstruction {
    return new IncrementInstruction(increment);
  }
}

class InitializeInstruction {
  instruction = InstructionType.Initialize;
  address: Uint8Array;

  constructor(address: PublicKey) {
    this.address = address.toBytes();
  }
}

class IncrementInstruction {
  instruction = InstructionType.Increment;
  increment: number;

  constructor(increment: number) {
    this.increment = increment;
  }
}

// Define the schema for Borsh serialization
const schema = new Map([
  [Instruction, {
    kind: 'enum', field: 'instruction', values: new Map([
      [InstructionType.Initialize, ['InitializeInstruction']],
      [InstructionType.Increment, ['IncrementInstruction']],
    ])
  }]
]);
