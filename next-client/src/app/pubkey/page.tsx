import { anchorProvider } from "@/lib/util"
import { Program } from "@coral-xyz/anchor";
import { useCallback } from "react"
import { pubkeyArgIDL, type PubkeyArg, escrowIDL } from "anchor-local";
import { PublicKey } from "@solana/web3.js";
import { useQuery } from "@tanstack/react-query";

const PUBKEY_TO_SAVE = "GriAght9Mi9m3BTKvPUM6426axdGayqCuqczczJrykdi";

export default function PubkeyArg() {

  const savePubkey = useCallback(async () => {
    const provider = await anchorProvider();
    const program = new Program<PubkeyArg>(
      // @ts-expect-error
      pubkeyArgIDL,
      provider
    );
    const signature = await program.methods.initialize(new PublicKey(PUBKEY_TO_SAVE))
      .accounts({})
      .rpc()

    await provider.connection.confirmTransaction(signature);
    console.log("Signature", signature);
  }, [])

  const savedPubkey = useQuery({
    queryKey: ["savedPubkey"],
    queryFn: async () => {
      const provider = await anchorProvider();
      const program = new Program<PubkeyArg>(
        // @ts-expect-error
        pubkeyArgIDL,
        provider
      );
      // seed: [programId, discriminator]
      const [pubkeyArgAddr] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("pubkeyArg"),
          Buffer.from(escrowIDL.accounts.find((acc) => acc.name === "pubkeyArg")?.discriminator!)
        ],
        program.programId
      );
      return program.account.pubkeyArg.fetch(pubkeyArgAddr);
    }
  })


  return <div>
    <div>
      <p>Saved pubkey:</p>
      {savedPubkey.data?.value && <p>{savedPubkey.data.value.toBase58()}</p>}
    </div>
    <button onClick={savePubkey}>
      Save Pubkey
    </button>
  </div>
}