use anchor_lang::prelude::*;
use anchor_spl::{associated_token::AssociatedToken, token::{Mint, Token, TokenAccount}};

declare_id!("2AvdcjV1eA45F98Uo1iN6CDG8QThTUPi7Rmn6nHSCET6");

#[program]
pub mod spl_demo {
    use super::*;

    // 1. create token with metadata 
    // 2. mint `mint_a` tokens to vault
    pub fn initialize(
        ctx: Context<Initialize>,
        token_name: String,
        token_symbol: String,
        token_uri: String,
        mint_amount: u64, // in lamports
    ) -> Result<()> {
        msg!("Greetings from: {:?}", ctx.program_id);
        Ok(())
    }

    // 1. transfer funding tokens to contract
    // 2. transfer `mint_a` tokens from vault to user
    pub fn redeem(
        ctx: Context<Redeem>,
        amount: u64,
    ) -> Result<()> {
        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(token_name: String, token_symbol: String, token_uri: String)]
pub struct Initialize<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    // Create mint account
    #[account(
        init,
        seeds = [b"mint".as_ref(), token_name.as_bytes(), token_symbol.as_bytes(), token_uri.as_bytes()],
        bump,
        payer = payer,
        mint::decimals = 9,
        // tune this to your liking
        mint::authority = mint_a.key(),
        mint::freeze_authority = mint_a.key(),
    )]
    pub mint_a: Account<'info, Mint>,

    #[account(
        init,
        payer = payer,
        associated_token::mint = mint_a,
        associated_token::authority = mint_a,
    )]
    // needs to mint tokens to this account to start
    pub vault_a: Account<'info, TokenAccount>, 

    // funding mint for the token contract accepts
    pub mint_b_funding: Account<'info, Mint>,

    // system programs
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
}

#[derive(Accounts)]
pub struct Redeem<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,

    pub mint_a: Account<'info, Mint>,
    pub mint_b: Account<'info, Mint>,
}

// MARK: - State

pub struct State {
    pub mint_a: Pubkey,
    pub mint_b: Pubkey,
    pub a_distributed_amount: u64,
}
