import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { AnchorCounter } from "../target/types/anchor_counter";
import { describe, it, expect } from "vitest";
import { startAnchor } from "solana-bankrun"
import { BankrunProvider } from "anchor-bankrun"
import { anchorCounterIDL } from "../index"
import { Keypair } from "@solana/web3.js";

describe("anchor-counter", () => {

  it.only("bankrun example", async () => {
    console.log("starting bankrun");
    const ctx = await startAnchor(".", [], []);
    const provider = new BankrunProvider(ctx);

    const program = new Program<AnchorCounter>(
      // @ts-ignore
      anchorCounterIDL,
      provider
    );
    const acc = new Keypair();
    const _tx = await program.methods.initialize(new anchor.BN(42))
      .accounts({
        counter: acc.publicKey,
        user: provider.wallet.publicKey,
      })
      .signers([acc])
      .rpc({ commitment: "processed" });

    const dataAccount = await program.account.counter.fetch(acc.publicKey, "processed");
    expect(dataAccount.count.toNumber()).toEqual(42); 
  }, 1_000_000);

});
