import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { AnchorCounter } from "../target/types/anchor_counter";
import { describe, it, expect } from "vitest";
import { startAnchor } from "solana-bankrun"
import { BankrunProvider } from "anchor-bankrun"
import { anchorCounterIDL } from "../index"
import { Keypair, PublicKey } from "@solana/web3.js";
import { BorshCoder } from "@coral-xyz/anchor";
import { MintLayout } from "@solana/spl-token";

describe("anchor-counter", () => {

  it("bankrun example", async () => {
    const ctx = await startAnchor(".", [], []);
    const provider = new BankrunProvider(ctx);

    const program = new Program<AnchorCounter>(
      // @ts-ignore
      anchorCounterIDL,
      provider
    );
    const acc = new Keypair();
    await program.methods.initialize(new anchor.BN(42))
      .accounts({
        counter: acc.publicKey,
        user: provider.wallet.publicKey,
      })
      .signers([acc])
      .rpc({ commitment: "processed" });

    const dataAccount = await program.account.counter.fetch(acc.publicKey, "processed");
    expect(dataAccount.count.toNumber()).toEqual(42);

    // const accountInfo = await provider.connection.getAccountInfo(acc.publicKey);
    // console.log(accountInfo);

    await program.methods.increment()
      .accounts({
        counter: acc.publicKey,
      })
      .rpc({ commitment: "processed" });

    const dataAccount2 = await program.account.counter.fetch(acc.publicKey, "processed");
    expect(dataAccount2.count.toNumber()).toEqual(43);
  }, 1_000_000);

  it("mocks state and increments", async () => {
    // @ts-ignore
    const coder = new BorshCoder(anchorCounterIDL);
    const counter = coder.types.encode("Counter", { count: new anchor.BN(42) });
    const acc = new Keypair();
    const programId = new PublicKey("8sbbinVKBHTxWBd1oDrjUnHY9GqB2QJJq4YeUdPnnVM6");
    const counterType = anchorCounterIDL.accounts.find(t => t.name === "Counter")!;
    const ctx = await startAnchor(".", [], [
      {
        address: acc.publicKey,
        info: {
          data: Buffer.concat([Buffer.from(counterType.discriminator), counter]),
          executable: false,
          lamports: 10000000000,
          owner: programId,
          rentEpoch: 18446744073709552000
        }
      }
    ]);
    const provider = new BankrunProvider(ctx);
    const program = new Program<AnchorCounter>(
      // @ts-ignore
      anchorCounterIDL,
      provider
    );

    await program.methods.increment()
      .accounts({
        counter: acc.publicKey,
      })
      .rpc();

    const dataAccount = await program.account.counter.fetch(acc.publicKey, "processed");
    expect(dataAccount.count.toNumber()).toEqual(43);
  });

});
