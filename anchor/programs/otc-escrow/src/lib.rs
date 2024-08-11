use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, Token, TokenAccount};

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
    // mutable because we are taking funds from the maker
    #[account(mut)]
    pub maker: Signer<'info>,

    // we have to make sure that these are valid SPL mint accounts
    #[account(mint::token_program = token_program)]
    pub token_mint_maker: Account<'info, Mint>,

    #[account(mint::token_program = token_program)]
    pub token_mint_taker: Account<'info, Mint>,

    #[account(
        mut,
        associated_token::mint = token_mint_maker,
        associated_token::authority = maker,
        associated_token::token_program = token_program
    )]
    pub token_account_maker: Account<'info, TokenAccount>,

    #[account(
        mut,
        associated_token::mint = token_mint_maker,
        // @todo what should be the authority for a contract-controlled ATA?
        associated_token::authority = maker,
        associated_token::token_program = token_program
    )]
    pub contract_token_account_maker: Account<'info, TokenAccount>,

    #[account(
        init, 
        payer = maker,
        space = 8 + OtcOffer::INIT_SPACE,
    )] 
    pub otc_offer: Account<'info, OtcOffer>,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
}

#[derive(InitSpace)]
#[account]
pub struct OtcOffer {
    pub maker: Pubkey,
    // address of the taker. Only the taker can claim the tokens.
    pub taker: Pubkey,
    pub token_mint_maker: Pubkey,
    pub token_maker_amount: u64,
    pub token_mint_taker: Pubkey,
    pub token_taker_amount: u64,
}
