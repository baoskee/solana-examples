"use client";
import { anchorProvider } from "@/lib/util";
import { BN, Program } from "@coral-xyz/anchor";
import { ASSOCIATED_TOKEN_PROGRAM_ID, createAssociatedTokenAccountIdempotent, createAssociatedTokenAccountIdempotentInstruction, createSyncNativeInstruction, getAssociatedTokenAddressSync, NATIVE_MINT, NATIVE_MINT_2022, TOKEN_2022_PROGRAM_ID, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { Keypair, LAMPORTS_PER_SOL, PublicKey, SystemProgram, Transaction } from "@solana/web3.js";
import { useQuery } from "@tanstack/react-query";
import { VirtualXyk, virtualXykIDL } from "anchor-local";
import { useCallback, useState } from "react";


const DEFAULT_MINT = "9V8jAEuE39E53omBeJe2LYZiGVmDKvZnJSoR8xPA4NHj";

export default function VirtualXykPage() {

  const [mint, setMint] = useState<string>(DEFAULT_MINT);
  const contractState = useQuery({
    queryKey: ["contractState"],
    queryFn: async () => {
      try {
        if (!mint) return;

        const p = await program();
        const [curveAddress] = PublicKey.findProgramAddressSync(
          [Buffer.from("curve"), new PublicKey(mint).toBuffer()],
          p.programId
        );
        const curve = await p.account.curve.fetch(curveAddress);

        return {
          tokenAmount: formatLamports(curve.tokenAmount),
          fundingAmount: formatLamports(curve.fundingAmount),
          virtualFundingAmount: formatLamports(curve.virtualFundingAmount),
          tokenMint: curve.tokenMint.toBase58(),
          fundingMint: curve.fundingMint.toBase58(),
          fundingFeeAmount: formatLamports(curve.fundingFeeAmount),
          feeAuthority: curve.feeAuthority.toBase58(),
          bump: curve.bump
        };
      } catch (e) {
        console.error(e);
        return null;
      }
    },
    enabled: !!mint,
  })

  const walletTokenBalance = useQuery({
    queryKey: ["walletTokenBalance"],
    queryFn: async () => {
      const p = await program();
      if (!p.provider.publicKey) return;

      const signerTokenAta = getAssociatedTokenAddressSync(
        new PublicKey(mint),
        p.provider.publicKey,
        true,
        TOKEN_2022_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
      );

      const account = await p.provider.connection.getTokenAccountBalance(signerTokenAta);
      if (!account) return;

      return account.value.uiAmount;
    }
  });

  const initializeCurve = useCallback(async () => {
    const p = await program();
    if (!p.provider.publicKey) return;

    const newMint = new Keypair();
    const [curve] = PublicKey.findProgramAddressSync(
      [Buffer.from("curve"), newMint.publicKey.toBuffer()],
      p.programId
    )

    const tokenVaultAccount = getAssociatedTokenAddressSync(
      newMint.publicKey,
      curve,
      true,
      TOKEN_2022_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID
    );
    const signature = await p.methods.initialize(
      "New launch token",
      "NEW",
      "https://example.com",
      // set it at 50 SOL
      new BN(50 * LAMPORTS_PER_SOL)
    )
      .accounts({
        signer: p.provider.publicKey,
        feeAuthority: p.provider.publicKey,
        tokenMint: newMint.publicKey,
        fundingMint: NATIVE_MINT, // solana mint

        // @ts-ignore
        tokenVault: tokenVaultAccount,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      })
      .signers([newMint])
      .rpc();

    console.log(signature);
    setMint(newMint.publicKey.toBase58());

    contractState.refetch();
  }, [contractState])

  const [buyAmount, setBuyAmount] = useState(0); 
  const onBuyClick = useCallback(async () => {
    const p = await program();
    if (!p.provider.publicKey) return;

    const [curve] = PublicKey.findProgramAddressSync(
      [Buffer.from("curve"), new PublicKey(mint).toBuffer()],
      p.programId
    ); 
    const signerFundingAta = getAssociatedTokenAddressSync(
      NATIVE_MINT,
      p.provider.publicKey,
      true,
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID
    );
    const createSignerFundingAta = createAssociatedTokenAccountIdempotentInstruction(
      p.provider.publicKey,
      signerFundingAta,
      p.provider.publicKey,
      NATIVE_MINT,
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID
    );
    const signerTokenAta = getAssociatedTokenAddressSync(
      new PublicKey(mint),
      p.provider.publicKey,
      true,
      TOKEN_2022_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID
    );
    const createSignerTokenAta = createAssociatedTokenAccountIdempotentInstruction(
      p.provider.publicKey,
      signerTokenAta,
      p.provider.publicKey,
      new PublicKey(mint),
      TOKEN_2022_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID
    );
    const fundingVault = getAssociatedTokenAddressSync(
      NATIVE_MINT,
      curve,
      true,
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID
    );
    const createFundingVault = createAssociatedTokenAccountIdempotentInstruction(
      p.provider.publicKey,
      fundingVault,
      curve,
      NATIVE_MINT,
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID
    );

    const tokenVault = getAssociatedTokenAddressSync(
      new PublicKey(mint),
      curve,
      true,
      TOKEN_2022_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID
    );

    const wrappedSolAta = getAssociatedTokenAddressSync(
      NATIVE_MINT,
      p.provider.publicKey,
      true,
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID
    );
    const createWrappedSolAta = createAssociatedTokenAccountIdempotentInstruction(
      p.provider.publicKey,
      wrappedSolAta,
      p.provider.publicKey,
      NATIVE_MINT,
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID
    );

    const buyInst = await p.methods.buyToken(
      new BN(buyAmount * LAMPORTS_PER_SOL)
    ).accounts({
      signer: p.provider.publicKey,
      tokenMint: new PublicKey(mint),
      fundingMint: NATIVE_MINT,
      // @ts-ignore
      curve,
      signerTokenAta,
      signerFundingAta,
      tokenVault,
      fundingVault,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      tokenProgram: TOKEN_2022_PROGRAM_ID,
      fundingTokenProgram: TOKEN_PROGRAM_ID,
    }).instruction();

    const tx = new Transaction().add(
      createSignerFundingAta,
      createSignerTokenAta,
      createFundingVault,
      createWrappedSolAta,
      SystemProgram.transfer({
        fromPubkey: p.provider.publicKey,
        toPubkey: wrappedSolAta,
        lamports: buyAmount * LAMPORTS_PER_SOL,
      }),
      createSyncNativeInstruction(wrappedSolAta),
      buyInst
    );

    const signature = await p.provider.sendAndConfirm!(tx);
    console.log(signature);

    contractState.refetch();
    walletTokenBalance.refetch();
  }, [mint, buyAmount, contractState, walletTokenBalance])

  const [sellAmount, setSellAmount] = useState(0);
  const onSellClick = useCallback(async () => {
    const p = await program();
    if (!p.provider.publicKey) return;
    const [curve] = PublicKey.findProgramAddressSync(
      [Buffer.from("curve"), new PublicKey(mint).toBuffer()],
      p.programId
    ); 

    const signature = await p.methods.sellToken(
      new BN(sellAmount * LAMPORTS_PER_SOL)
    ).accounts({
      signer: p.provider.publicKey,
      tokenMint: new PublicKey(mint),
      fundingMint: NATIVE_MINT,

      // @ts-ignore
      curve,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      tokenProgram: TOKEN_2022_PROGRAM_ID,
      fundingTokenProgram: TOKEN_PROGRAM_ID,
    }).rpc();

    console.log(signature);

    contractState.refetch();
    walletTokenBalance.refetch();
  }, [mint, sellAmount, walletTokenBalance, contractState])

  const redeemFees = useCallback(async () => {
    const p = await program();
    if (!p.provider.publicKey) return;

    const signature = await p.methods.redeemFees()
      .accounts({
        signer: p.provider.publicKey,
        fundingMint: NATIVE_MINT,
        tokenMint: new PublicKey(mint),
        // @ts-ignore
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        fundingTokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc();
    console.log(signature);

    contractState.refetch();
    walletTokenBalance.refetch();
  }, [contractState, walletTokenBalance, mint])


  return <div className="flex flex-col gap-4">
    <h1>VirtualXykPage</h1>
    <p>
      Current Mint for new token: {mint}
    </p>
    <p>
      Wallet token balance: {walletTokenBalance.data}
    </p>
    <pre className="text-xs">{JSON.stringify(contractState.data, null, 2)}</pre>
    <button onClick={initializeCurve}>
      Launch token
    </button> 

    <div className="flex gap-2 items-center">
      <p>
        You pay in SOL:
      </p>
      <input type="number"
        className="px-4 bg-slate-600 rounded-lg py-2"
        value={buyAmount}
        onChange={(e) => setBuyAmount(Number(e.target.value))}
      />
      <button onClick={onBuyClick}>
        Buy
      </button>
    </div>
    <div className="flex gap-2 items-center">
      <p>
        You pay in token:
      </p>
      <input type="number"
        className="px-4 bg-slate-600 rounded-lg py-2"
        value={sellAmount}
        onChange={(e) => setSellAmount(Number(e.target.value))}
      />
      <button onClick={onSellClick}>
        Sell
      </button>
    </div>
    <button onClick={redeemFees}>
      Redeem fees
    </button>
  </div>;
}

const program = async () => {
  const provider = await anchorProvider();
  const program = new Program<VirtualXyk>(
    // @ts-ignore
    virtualXykIDL,
    provider
  );

  return program;
}

function formatLamports(lamports: BN): string {
  const lamportsString = lamports.toString();
  const decimalIndex = lamportsString.length - 9;
  if (decimalIndex <= 0) {
    return "0." + lamportsString.padStart(9, "0");
  }
  return lamportsString.slice(0, decimalIndex) + "." + lamportsString.slice(decimalIndex);
}