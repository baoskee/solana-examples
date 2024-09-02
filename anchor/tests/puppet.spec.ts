import * as anchor from '@coral-xyz/anchor'
import { Program } from '@coral-xyz/anchor'
import { Connection, Keypair, PublicKey, SystemProgram } from '@solana/web3.js'
import { Puppet } from '../target/types/puppet'
import { PuppetMaster } from '../target/types/puppet_master'
import { describe, it, expect, beforeEach, beforeAll } from 'vitest'
import { confirmTransaction } from '@solana-developers/helpers'
import { BankrunProvider } from 'anchor-bankrun'
import { startAnchor } from 'solana-bankrun'
import { puppetIdl, puppetMasterIDL } from '..'

describe('puppet', () => {
  it('Does CPI!', async () => {

    const ctx = await startAnchor(".", [], []);
    const provider = new BankrunProvider(ctx);
    const puppetProgram = new Program<Puppet>(
      // @ts-ignore
      puppetIdl,
      provider
    )
    const puppetMasterProgram = new Program<PuppetMaster>(
      // @ts-ignore
      puppetMasterIDL,
      provider
    );
    const puppetKeypair = Keypair.generate()

    const res = await puppetProgram.methods
      .initialize()
      .accounts({
        puppet: puppetKeypair.publicKey,
        signer: provider.wallet.publicKey,
        // @ts-ignore
        systemProgram: SystemProgram.programId,
      })
      .signers([puppetKeypair])
      .rpc({ commitment: "processed" })

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
      .rpc({ commitment: "processed" })

    console.log('Puppet pulled!', res)

    expect(
      (
        await puppetProgram.account.data.fetch(puppetKeypair.publicKey, "processed")
      ).data.toNumber()
    ).to.equal(42)
  })
}, 1_000_000)