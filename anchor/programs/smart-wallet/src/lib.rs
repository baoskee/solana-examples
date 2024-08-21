use anchor_lang::prelude::*;

declare_id!("12ojTiLE1QzfpucQd9rfiibrhqTRXQ3jMbUnGN5BzA3a");

#[program]
pub mod smart_wallet {
    use anchor_lang::solana_program::{instruction::Instruction, program::invoke_signed};

    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        let wallet_meta = &mut ctx.accounts.wallet_meta;
        wallet_meta.authority = ctx.accounts.authority.key();
        Ok(())
    }

    pub fn execute<'c: 'info, 'info>(
        ctx: Context<'_, '_, 'c, 'info, Execute<'info>>, 
        data: Vec<u8>
    ) -> Result<()> {
        let meta_key = ctx.accounts.wallet_meta.to_account_info().key();
        let signer_seeds: &[&[&[u8]]] = &[&[meta_key.as_ref(), &[ctx.bumps.wallet]]];
        let accounts = ctx.remaining_accounts.iter().map(|a| { 
            AccountMeta {
                pubkey: a.key(),
                // smart wallet itself must be signer always
                is_signer: a.key() == ctx.accounts.wallet.key() || a.is_signer,
                is_writable: a.is_writable, 
            }
        }).collect::<Vec<AccountMeta>>();

        msg!("Meta Key: {:?}", meta_key);
        msg!("Signer Seeds: {:?}", signer_seeds);
        msg!("Accounts: {:?}", accounts);

        let instruction = Instruction {
            program_id: ctx.accounts.instruction_program.key(),
            accounts,
            data,
        };

        // Print instruction args
        msg!("Instruction Program ID: {:?}", instruction.program_id);
        msg!("Instruction Data: {:?}", instruction.data);
        msg!("Instruction Accounts:");
        for (i, account) in instruction.accounts.iter().enumerate() {
            msg!("  Account {}: pubkey={:?}, is_signer={}, is_writable={}", 
                 i, account.pubkey, account.is_signer, account.is_writable);
        }

        let remaining_accounts = ctx.remaining_accounts.iter().map(|a| {
            let mut account_info = a.to_account_info();
            if account_info.key() == ctx.accounts.wallet.key() {
                account_info.is_signer = true;
            }
            account_info
        }).collect::<Vec<_>>();

        // IMPORTANT: Execute on behalf of `wallet` System Account
        invoke_signed(
            &instruction,
            &remaining_accounts,
            signer_seeds,
        )?;
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        init,
        payer = authority,
        space = 8 + WalletMeta::INIT_SPACE,
        seeds = [authority.key().as_ref()], 
        bump
    )]
    pub wallet_meta: Account<'info, WalletMeta>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Execute<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(
        mut,
        has_one = authority,
        seeds = [authority.key().as_ref()],
        bump
    )]
    pub wallet_meta: Account<'info, WalletMeta>,
    // canonical wallet address
    // this PDA uses contract program ID, so we can sign for it.
    // but it is owned by System Program, so it is in-distinguishable from an EOA wallet
    #[account(
        mut,
        seeds = [wallet_meta.key().as_ref()],
        bump
    )]
    pub wallet: SystemAccount<'info>,

    /// CHECK: This is unchecked because we don't know what the instruction program is
    pub instruction_program: UncheckedAccount<'info>,
}

#[account]
#[derive(InitSpace)]
pub struct WalletMeta {
    pub authority: Pubkey,
}
