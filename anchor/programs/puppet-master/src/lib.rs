use anchor_lang::prelude::*;
use puppet::cpi::accounts::SetData;
use puppet::program::Puppet;
use puppet::{self, Data};

declare_id!("F4YurBauRjWpHpynNZhARWezDoDc2wLCWTjoihe338Ck");

#[program]
pub mod puppet_master {
    use super::*;

    pub fn pull_strings(ctx: Context<PullStrings>, data: u64) -> Result<()> {
        let cpi_program = ctx.accounts.puppet_program.to_account_info();
        let cpi_accounts = SetData {
            signer: ctx.accounts.pda_account.to_account_info(),
            puppet: ctx.accounts.puppet.to_account_info(),
        };
        let signer_key = ctx.accounts.signer.key();
        let signer_seeds: &[&[&[u8]]] = &[&[
            b"pda", 
            signer_key.as_ref(),
            &[ctx.bumps.pda_account],
        ]];
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts)
            .with_signer(signer_seeds);
        puppet::cpi::set_data(cpi_ctx, data)
    }
}

#[derive(Accounts)]
pub struct PullStrings<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,
    #[account(
        mut,
        seeds = [b"pda", signer.key().as_ref()],
        bump,
    )]
    pub pda_account: SystemAccount<'info>,
    #[account(mut)]
    pub puppet: Account<'info, Data>,
    pub puppet_program: Program<'info, Puppet>,
}
