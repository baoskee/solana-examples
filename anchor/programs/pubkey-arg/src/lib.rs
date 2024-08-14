use anchor_lang::prelude::*;

declare_id!("2hAqft8LyeYA6KZhptCjhLCLepdukDk8rk1TBAoAkDk2");

#[program]
pub mod pubkey_arg {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>, value: Pubkey) -> Result<()> {
        ctx.accounts.pubkey_arg.set_inner(PubkeyArg { value });
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,
    #[account(
        init,
        payer = signer,
        space = 8 + 32,
    )]
    pub pubkey_arg: Account<'info, PubkeyArg>,

    pub system_program: Program<'info, System>,
}

#[account]
pub struct PubkeyArg {
    pub value: Pubkey,
}
