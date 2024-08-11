import { connectAnchorWallet, LOCAL_RPC_URL } from "@/lib/util"
import { Connection } from "@solana/web3.js";
import * as anchor from '@coral-xyz/anchor';

export default function EscrowPage() {
  return <div>Escrow</div> 
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