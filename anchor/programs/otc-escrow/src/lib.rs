use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, Token, TokenAccount};

declare_id!("2Ny42tQow4mph5MW5AZSoM6TJ2ABa5JEGcGrxs6c1myT");

#[program]
pub mod escrow {
    use anchor_spl::token::{transfer_checked, TransferChecked};

    use super::*;

    pub fn initialize(
        ctx: Context<Initialize>, 
        id_seed: u64,
        token_maker_amount: u64,
        token_taker_amount_wanted: u64, 
        taker: Pubkey,
    ) -> Result<()> {
        // 1. transfer the tokens from the maker to the contract_token_account  
        let transfer_accounts = TransferChecked {
            from: ctx.accounts.token_account_maker.to_account_info(),
            mint: ctx.accounts.token_mint_a.to_account_info(),
            to: ctx.accounts.contract_token_account.to_account_info(),
            authority: ctx.accounts.maker.to_account_info(),
        };

        let cpi_context = CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            transfer_accounts,
        );

        transfer_checked(
            cpi_context,
            token_maker_amount,
            ctx.accounts.token_mint_a.decimals,
        )?;

        // 2. initialize the otc_offer account
        ctx.accounts.otc_offer.set_inner(OtcOffer {
            maker: ctx.accounts.maker.key(),
            taker,
            token_mint_a: ctx.accounts.token_mint_a.key(),
            token_maker_amount,
            token_mint_b: ctx.accounts.token_mint_b.key(),
            token_taker_amount: token_taker_amount_wanted,
            // notice client will provide id but the bump is calculated by Anchor
            id_seed,
            bump: ctx.bumps.otc_offer,
        });

        Ok(())
    }

    pub fn claim(ctx: Context<Claim>) -> Result<()> {
        return Err(ErrorCode::RequireViolated.into());
    }
}

#[derive(Accounts)]
#[instruction(id_seed: u64)]
pub struct Initialize<'info> {
    // mutable because we are taking funds from the maker
    #[account(mut)]
    pub maker: Signer<'info>,

    // we have to make sure that these are valid SPL mint accounts
    #[account(mint::token_program = token_program)]
    pub token_mint_a: Account<'info, Mint>,

    #[account(mint::token_program = token_program)]
    pub token_mint_b: Account<'info, Mint>,

    #[account(
        mut,
        associated_token::mint = token_mint_a,
        associated_token::authority = maker,
        associated_token::token_program = token_program
    )]
    pub token_account_maker: Account<'info, TokenAccount>,

    #[account(
        mut,
        associated_token::mint = token_mint_a,
        associated_token::authority = otc_offer,
        associated_token::token_program = token_program
    )]
    pub contract_token_account: Account<'info, TokenAccount>,

    #[account(
        init, 
        payer = maker,
        space = 8 + OtcOffer::INIT_SPACE,
        // we're using the otc_offer account as the ATA authority for contract
        // this creates a PDA for the otc_offer account with the following seeds
        seeds = [b"otc_offer", maker.key().as_ref(), id_seed.to_le_bytes().as_ref()],
        bump
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
    pub token_mint_a: Pubkey,
    pub token_maker_amount: u64,
    pub token_mint_b: Pubkey,
    pub token_taker_amount: u64,

    // `id_seed` is an input to derive the PDA seed
    // makes for 2**64 possible offers given the same maker address
    // IMPORTANT: `id_seed` allows maker to have multiple offers at the same time
    // ```
    // seeds = [b"otc_offer", maker.key().as_ref(), id_seed.to_le_bytes().as_ref()],
    // ```
    pub id_seed: u64, 
    pub bump: u8, 
    // anchor does not store bump automatically... 
    // so we have to manually store it in Initialize
}

#[derive(Accounts)]
pub struct Claim<'info> {
    #[account(mut)]
    pub taker: Signer<'info>,

    pub token_mint_a: Account<'info, Mint>,
    pub token_mint_b: Account<'info, Mint>,

    #[account(
        mut,
        constraint = otc_offer.taker == taker.key(),
        constraint = otc_offer.token_mint_a == token_mint_a.key(),
        constraint = otc_offer.token_mint_b == token_mint_b.key()
    )]
    pub otc_offer: Account<'info, OtcOffer>,
}
