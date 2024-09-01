import { describe, it, expect } from "vitest";
import anchor, { BN } from "@coral-xyz/anchor";
import { Connection, PublicKey, SystemProgram, Transaction, TransactionInstruction } from "@solana/web3.js";
import { confirmTransaction, makeKeypairs } from "@solana-developers/helpers";
import { createAssociatedTokenAccountIdempotentInstruction, createInitializeMint2Instruction, createMintToInstruction, getAssociatedTokenAddressSync, getMinimumBalanceForRentExemptMint, MINT_SIZE, TOKEN_2022_PROGRAM_ID, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { randomBytes } from "crypto"
import { escrowIDL, type Escrow } from "../"

const TOKEN_PROGRAM: typeof TOKEN_2022_PROGRAM_ID | typeof TOKEN_PROGRAM_ID = TOKEN_PROGRAM_ID;

describe.skip("escrow", async () => {

  const connection = new Connection("http://localhost:8899");

  const [alice, bob, tokenMintA, tokenMintB] = makeKeypairs(4);
  const provider = new anchor.AnchorProvider(connection, new anchor.Wallet(alice));

  it("should create an escrow", async () => {
    const [aliceTokenAccountA, aliceTokenAccountB, bobTokenAccountA, bobTokenAccountB] = [alice, bob].flatMap((keypair) =>
      [tokenMintA, tokenMintB].map((mint) => getAssociatedTokenAddressSync(mint.publicKey, keypair.publicKey, false, TOKEN_PROGRAM)),
    );

    // Request airdrop for Alice
    const airdropSignature = await connection.requestAirdrop(
      alice.publicKey,
      2 * anchor.web3.LAMPORTS_PER_SOL
    );

    // Confirm the airdrop transaction
    await connection.confirmTransaction(airdropSignature);

    // Verify the balance
    const aliceBalance = await connection.getBalance(alice.publicKey);
    expect(aliceBalance).to.be.at.least(2 * anchor.web3.LAMPORTS_PER_SOL);

    const minimumLamports = await getMinimumBalanceForRentExemptMint(connection);
    const createMintInstructions: Array<TransactionInstruction> = [tokenMintA, tokenMintB].map((mint) =>
      SystemProgram.createAccount({
        fromPubkey: provider.publicKey,
        newAccountPubkey: mint.publicKey,
        lamports: minimumLamports,
        space: MINT_SIZE,
        programId: TOKEN_PROGRAM,
      }),
    );
    // Make tokenA and tokenB mints, mint tokens and create ATAs
    const mintTokensInstructions: Array<TransactionInstruction> = [
      {
        mint: tokenMintA.publicKey,
        authority: alice.publicKey,
        ata: aliceTokenAccountA,
      },
      {
        mint: tokenMintB.publicKey,
        authority: bob.publicKey,
        ata: bobTokenAccountB,
      },
    ].flatMap((mintDetails) => [
      createInitializeMint2Instruction(mintDetails.mint, 6, mintDetails.authority, null, TOKEN_PROGRAM),
      createAssociatedTokenAccountIdempotentInstruction(provider.publicKey, mintDetails.ata, mintDetails.authority, mintDetails.mint, TOKEN_PROGRAM),
      createMintToInstruction(mintDetails.mint, mintDetails.ata, mintDetails.authority, 1_000_000_000, [], TOKEN_PROGRAM),
    ]);

    // Add all these instructions to our transaction
    const tx = new Transaction();
    tx.instructions = [...createMintInstructions, ...mintTokensInstructions];
    await provider.sendAndConfirm(tx, [tokenMintA, tokenMintB, alice, bob]);

    // MARK: Make offer 
    const program = new anchor.Program<Escrow>(
      // @ts-ignore
      escrowIDL, provider);
    const offerId = new BN(randomBytes(8)); // u64 
    const [offerPda, _] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("otc_offer"),
        alice.publicKey.toBuffer(),
        offerId.toArrayLike(Buffer, "le", 8)
      ], 
      program.programId
    );

    const signature = await program.methods.initialize(
      offerId,
      new anchor.BN(10),
      new anchor.BN(20),
      bob.publicKey,
    ).accounts({
      maker: provider.wallet.publicKey,
      tokenMintA: tokenMintA.publicKey,
      tokenMintB: tokenMintB.publicKey, 
    }).rpc();
    await confirmTransaction(connection, signature);
    
    const offerAccount = await program.account.otcOffer.fetch(offerPda);
    expect(offerAccount.maker).toEqual(alice.publicKey);
    expect(offerAccount.tokenMintA).toEqual(tokenMintA.publicKey);
    expect(offerAccount.tokenMintB).toEqual(tokenMintB.publicKey);
    expect(offerAccount.tokenAAmount.toNumber()).toEqual(10);
    expect(offerAccount.tokenBAmount.toNumber()).toEqual(20);
    // @todo WHY IS THIS HAPPENING??
    expect(offerAccount.taker).toEqual(bob.publicKey);
  });

}, 60e6)
