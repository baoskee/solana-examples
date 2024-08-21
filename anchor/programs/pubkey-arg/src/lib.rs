use anchor_lang::prelude::*;

declare_id!("CszGbucGUE2H5gwuGZQNmAJ1Qe1uHmst36ZmxP4Z4yvy");

#[program]
pub mod pubkey_arg {
    use super::*;

    pub fn initialize(
        ctx: Context<Initialize>,
        id_seed: u64,
        token_a_amount: u64,
        token_b_amount: u64,
        value: Pubkey,
    ) -> Result<()> {
        ctx.accounts.pubkey_arg.set_inner(PubkeyArg {
            id_seed,
            token_a_amount,
            token_b_amount,
            value,
        });
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
        space = 8 + PubkeyArg::INIT_SPACE,
    )]
    pub pubkey_arg: Account<'info, PubkeyArg>,

    pub system_program: Program<'info, System>,
}

#[account]
#[derive(InitSpace)]

pub struct PubkeyArg {
    pub id_seed: u64,
    pub token_a_amount: u64,
    pub token_b_amount: u64,
    pub value: Pubkey,
}
