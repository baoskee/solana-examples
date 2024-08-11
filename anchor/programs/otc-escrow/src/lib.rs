use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, Token};

declare_id!("2Ny42tQow4mph5MW5AZSoM6TJ2ABa5JEGcGrxs6c1myT");

#[program]
pub mod escrow {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        msg!("Greetings from: {:?}", ctx.program_id);
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(mut)]
    pub maker: Signer<'info>,
    // address of the taker. Only the taker can claim the tokens.
    pub taker: UncheckedAccount<'info>,

    pub token_mint_maker: Account<'info, Mint>, 
    pub token_mint_taker: Account<'info, Mint>,

    #[account(
        init, 
        payer = maker,
        space = 8 + OtcOffer::INIT_SPACE,
    )] 
    pub otc_offer: Account<'info, OtcOffer>,

    pub system_program: Program<'info, System>,
    // @wip Why do we need this?
    pub token_program: Program<'info, Token>,
}

#[derive(InitSpace)]
#[account]
pub struct OtcOffer {
    pub maker: Pubkey,
    pub taker: Pubkey,
    pub token_mint_maker: Pubkey,
    pub token_maker_amount: u64,
    pub token_mint_taker: Pubkey,
    pub token_taker_amount: u64,
}
