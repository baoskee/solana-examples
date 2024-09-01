import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { AnchorCounter } from "../target/types/anchor_counter";
import { describe, it, expect } from "vitest";

describe.skip("anchor-counter", () => {

  it("Is initialized!", async () => {
    // Configure the client to use the local cluster.
    const program = anchor.workspace.AnchorCounter as Program<AnchorCounter>;
    // Add your test here.
    const tx = await program.methods.initialize(new anchor.BN(8)).rpc();
    console.log("Your transaction signature", tx);
  });
});
