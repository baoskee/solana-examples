"use client"

import { connectAnchorWallet, LOCAL_RPC_URL } from "@/lib/util"
import { Connection } from "@solana/web3.js";
import * as anchor from '@coral-xyz/anchor';
import { useCallback } from "react";
import { escrowIDL, Escrow } from "anchor-local";
import { sign } from "crypto";

// Fill out your params here
const TOKEN_MINT_A = "5CiESJk1uYGZ82S4YhaC5YCjRbUX1J4Q6Xf2ZWmYC6g7"
const TOKEN_MINT_A_AMOUNT = 100
const TOKEN_MINT_B = "Ekxo7ZXy5QgStoSeLsoAjcP14as1YeyKT83eziPdFcWh"
const TOKEN_MINT_B_AMOUNT = 200
const TAKER = "HNc5mQKb5X7Agsk866kxM1yLv6dVDTPJnuPSsanGhrFo"

export default function EscrowPage() {

  const depositEscrow = useCallback(async () => {
    try {
      const provider = await anchorProvider();
      const program = new anchor.Program<Escrow>(
        // @ts-ignore
        escrowIDL, provider);
      const res = await program.methods.initialize(
        new anchor.BN(1),
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

      console.log(res);
    } catch (e) {
      console.error(e);
    }
  }, [])

  return <div>
    <div>
      <div>Token Mint A: {TOKEN_MINT_A}</div>
      <div>Token Mint A Amount: {TOKEN_MINT_A_AMOUNT}</div>
      <div>Token Mint B: {TOKEN_MINT_B}</div>
      <div>Token Mint B Amount: {TOKEN_MINT_B_AMOUNT}</div>
      <div>Taker: {TAKER}</div>
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