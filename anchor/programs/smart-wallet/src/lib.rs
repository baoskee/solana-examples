use anchor_lang::prelude::*;

declare_id!("BKhDWiNiM9ZEo3Deyf7MmfDMyDYwLeGLagorJ5GtV8XC");

#[program]
pub mod smart_wallet {
    use anchor_lang::solana_program::{instruction::Instruction, program::invoke_signed, system_instruction};

    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        let wallet = &mut ctx.accounts.wallet;
        wallet.authority = ctx.accounts.authority.key();
        Ok(())
    }

    pub fn execute(ctx: Context<Execute>, data: Vec<u8>) -> Result<()> {
        let seeds = &[ctx.accounts.wallet.authority.as_ref(), &[ctx.bumps.wallet]];
        let signer_seeds = &[&seeds[..]];

        let accounts = ctx.remaining_accounts.iter().map(|a| {
            AccountMeta {
                pubkey: a.key(),
                is_signer: a.is_signer,
                is_writable: a.is_writable,
            }
        }).collect();

        let instruction = Instruction {
            program_id: ctx.accounts.instruction_program.key(),
            accounts,
            data,
        };

        invoke_signed(&instruction, ctx.remaining_accounts, signer_seeds)?;
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
        space = 8 + Wallet::INIT_SPACE,
        seeds = [authority.key().as_ref()], 
        bump
    )]
    pub wallet: Account<'info, Wallet>,
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
    pub wallet: Account<'info, Wallet>,
    /// CHECK: This is unchecked because we don't know what the instruction program is
    pub instruction_program: UncheckedAccount<'info>,
}

#[account]
#[derive(InitSpace)]
pub struct Wallet {
    pub authority: Pubkey,
}
