import * as anchor from '@coral-xyz/anchor'
import { Program } from '@coral-xyz/anchor'
import { Connection, Keypair, PublicKey, SystemProgram } from '@solana/web3.js'
import { Puppet } from '../target/types/puppet'
import { PuppetMaster } from '../target/types/puppet_master'
import { describe, it, expect, beforeEach, beforeAll } from 'vitest'
import { confirmTransaction } from '@solana-developers/helpers'

describe.only('puppet', () => {
  const connection = new Connection("http://localhost:8899");
  const alice = new Keypair();
  const provider = new anchor.AnchorProvider(connection, new anchor.Wallet(alice));
  anchor.setProvider(provider)

  beforeAll(async () => {
    // Request airdrop for Alice
    const airdropSignature = await connection.requestAirdrop(
      alice.publicKey,
      2_000 * anchor.web3.LAMPORTS_PER_SOL
    );

    // Confirm the airdrop transaction
    await connection.confirmTransaction(airdropSignature);
    console.log('Airdropped 2_000 SOL to Alice')
  }, 100_000)

  const puppetProgram = anchor.workspace.Puppet as Program<Puppet>
  const puppetMasterProgram = anchor.workspace
    .PuppetMaster as Program<PuppetMaster>
  const puppetKeypair = Keypair.generate()

  it('Does CPI!', async () => {
    const res = await puppetProgram.methods
      .initialize()
      .accounts({
        puppet: puppetKeypair.publicKey,
        signer: provider.wallet.publicKey,
        // @ts-ignore
        systemProgram: SystemProgram.programId,
      })
      .signers([puppetKeypair])
      .rpc()
    
    console.log('Puppet initialized!', res)
    const [pdaAccount] = PublicKey.findProgramAddressSync(
      [Buffer.from('pda'), provider.wallet.publicKey.toBuffer()],
      puppetMasterProgram.programId
    );

    await puppetMasterProgram.methods
      .pullStrings(new anchor.BN(42))
      .accounts({
        signer: provider.wallet.publicKey,
        puppet: puppetKeypair.publicKey,
        // @ts-ignore
        pdaAccount, 
        puppetProgram: puppetProgram.programId,
      })
      .rpc()

    console.log('Puppet pulled!', res)

    expect(
      (
        await puppetProgram.account.data.fetch(puppetKeypair.publicKey, "processed")
      ).data.toNumber()
    ).to.equal(42)
  })
}, 1_000_000)