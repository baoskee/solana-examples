use anchor_lang::prelude::*;

declare_id!("FxhAgWhnKhghCtTF2c6fPxo1LKueHTuypjTR6fSejJXS");

#[program]
pub mod cpi_signer {
    use anchor_lang::system_program::{transfer, Transfer};

    use super::*;

    pub fn sol_transfer(ctx: Context<SolTransfer>, amount: u64) -> Result<()> {
        let from_pubkey = ctx.accounts.pda_account.to_account_info();
        let to_pubkey = ctx.accounts.recipient.to_account_info();
        let program_id = ctx.accounts.system_program.to_account_info();

        let seed = to_pubkey.key();
        let signer_seeds: &[&[&[u8]]] = &[&[
            b"pda",
            seed.as_ref(),
            &[ctx.bumps.pda_account],
        ]];

        let cpi_context = CpiContext::new(
            program_id,
            Transfer {
                from: from_pubkey,
                to: to_pubkey,
            },
        ).with_signer(signer_seeds);

        transfer(cpi_context, amount)?;
        Ok(())
    }
}

#[derive(Accounts)]
pub struct SolTransfer<'info> {
    #[account(
        mut,
        seeds = [b"pda", recipient.key().as_ref()],
        bump, 
    )]
    pda_account: SystemAccount<'info>, 
    #[account(mut)]
    recipient: SystemAccount<'info>,
    system_program: Program<'info, System>,
}
