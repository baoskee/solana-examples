"use client"

import { connectAnchorWallet, LOCAL_RPC_URL } from "@/lib/util"
import { Connection, PublicKey } from "@solana/web3.js";
import * as anchor from '@coral-xyz/anchor';
import { useCallback } from "react";
import { escrowIDL, Escrow } from "anchor-local";
import { useQuery } from "@tanstack/react-query";

// Fill out your params here
const TOKEN_MINT_A = "5CiESJk1uYGZ82S4YhaC5YCjRbUX1J4Q6Xf2ZWmYC6g7"
const TOKEN_MINT_A_AMOUNT = 100
const TOKEN_MINT_B = "5CiESJk1uYGZ82S4YhaC5YCjRbUX1J4Q6Xf2ZWmYC6g7"
const TOKEN_MINT_B_AMOUNT = 200
const TAKER = "HNc5mQKb5X7Agsk866kxM1yLv6dVDTPJnuPSsanGhrFo"

const OFFER_ID = 4; // increment this to create new offers

export default function EscrowPage() {

  const depositEscrow = useCallback(async () => {
    try {
      const provider = await anchorProvider();
      const program = new anchor.Program<Escrow>(
        // @ts-ignore
        escrowIDL, provider);
      const res = await program.methods.initialize(
        // increment this to create new offers
        new anchor.BN(OFFER_ID),
        new anchor.BN(TOKEN_MINT_A_AMOUNT),
        new anchor.BN(TOKEN_MINT_B_AMOUNT),
        new anchor.web3.PublicKey(TAKER)
      )
        .accounts({
          maker: provider.wallet.publicKey,
          tokenMintA: new anchor.web3.PublicKey(TOKEN_MINT_A),
          tokenMintB: new anchor.web3.PublicKey(TOKEN_MINT_B),
        })
        .rpc();

      // transaction signature
      console.log(res);
    } catch (e) {
      console.error(e);
    }
  }, [])

  // to get OTC offer accounts, simply derive PDA from seed in program
  // or use Anchor
  const offerDetails = useQuery({
    queryKey: ["offerDetails", OFFER_ID],
    queryFn: async () => {
      try {
        const provider = await anchorProvider();
        const program = new anchor.Program<Escrow>(
          // @ts-ignore
          escrowIDL, provider);

        const [offerPda, _] = PublicKey.findProgramAddressSync(
          [
            Buffer.from("otc_offer"),
            provider.wallet.publicKey.toBuffer(), // maker seed 
            new anchor.BN(OFFER_ID).toArrayLike(Buffer, "le", 8)
          ],
          program.programId
        )

        const offerDetails = await program.account.otcOffer.fetch(offerPda)
        return offerDetails
      } catch (e) {
        console.error(e)
      }
    }
  })

  return <div>
    <div>
      <div>Token Mint A: {TOKEN_MINT_A}</div>
      <div>Token Mint A Amount: {TOKEN_MINT_A_AMOUNT}</div>
      <div>Token Mint B: {TOKEN_MINT_B}</div>
      <div>Token Mint B Amount: {TOKEN_MINT_B_AMOUNT}</div>
      <div>Taker: {TAKER}</div>
      <div>Offer ID: {OFFER_ID}</div>
    </div>
    <div>
      <div>Offer ID: {OFFER_ID}</div>
      <div>Offer Details: 
        <pre className="text-xs">
          {offerDetails.data && JSON.stringify(offerDetails.data, null, 2)}
        </pre>
      </div>
    </div>
    <button className="my-4" onClick={depositEscrow}>
      Deposit Escrow
    </button>

  </div>
}

/**
 * ```
 * const provider = await anchorProvider();
 * anchor.setProvider(provider);
 * ```
 */
const anchorProvider = async () => {
  const wallet = await connectAnchorWallet();
  const connection = new Connection(LOCAL_RPC_URL);

  const provider = new anchor.AnchorProvider(connection, wallet, {});
  return provider;
}