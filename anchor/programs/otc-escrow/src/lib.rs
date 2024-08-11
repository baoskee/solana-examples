use anchor_lang::prelude::*;
use anchor_spl::{associated_token::AssociatedToken, token::{Mint, Token, TokenAccount}};

declare_id!("2Ny42tQow4mph5MW5AZSoM6TJ2ABa5JEGcGrxs6c1myT");

#[program]
pub mod escrow {
    use anchor_spl::token::{transfer_checked, TransferChecked};

    use super::*;

    pub fn initialize(
        ctx: Context<Initialize>, 
        id_seed: u64,
        token_a_amount: u64,
        token_b_amount: u64,
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
            token_a_amount,
            ctx.accounts.token_mint_a.decimals,
        )?;

        // 2. initialize the otc_offer account
        ctx.accounts.otc_offer.set_inner(OtcOffer {
            maker: ctx.accounts.maker.key(),
            taker,
            token_mint_a: ctx.accounts.token_mint_a.key(),
            token_a_amount,
            token_mint_b: ctx.accounts.token_mint_b.key(),
            token_b_amount,
            // notice client will provide id but the bump is calculated by Anchor
            id_seed,
            bump: ctx.bumps.otc_offer,
        });

        Ok(())
    }

    pub fn claim(ctx: Context<Claim>) -> Result<()> {
        // 1. transfer token b to maker 
        let transfer_accounts = TransferChecked {
            from: ctx.accounts.token_account_taker_b.to_account_info(),
            mint: ctx.accounts.token_mint_b.to_account_info(),
            to: ctx.accounts.token_account_maker_b.to_account_info(),
            authority: ctx.accounts.taker.to_account_info(),
        };

        let cpi_context = CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            transfer_accounts,
        );

        transfer_checked(
            cpi_context, 
            ctx.accounts.otc_offer.token_b_amount, 
            ctx.accounts.token_mint_b.decimals,
        )?;

        // 2. transfer vault tokens to taker 
        let transfer_accounts = TransferChecked {
            from: ctx.accounts.contract_token_account.to_account_info(),
            mint: ctx.accounts.token_mint_a.to_account_info(),
            to: ctx.accounts.token_account_taker_a.to_account_info(),
            authority: ctx.accounts.otc_offer.to_account_info(),
        };

        let signer_seeds: [&[&[u8]]; 1] = [&[
            b"otc_offer",
            ctx.accounts.maker.to_account_info().key.as_ref(),
            &ctx.accounts.otc_offer.id_seed.to_le_bytes()[..],
            &[ctx.accounts.otc_offer.bump],
        ]];

        let cpi_context = CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            transfer_accounts,
        ).with_signer(&signer_seeds);

        transfer_checked(
            cpi_context,
            ctx.accounts.otc_offer.token_a_amount,
            ctx.accounts.token_mint_a.decimals,
        )?;

        // @todo close all accounts to save on storage costs
        Ok(())
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
        // @improvement: add init_if_needed constraint 
        mut,
        associated_token::mint = token_mint_a,
        associated_token::authority = maker,
        associated_token::token_program = token_program
    )]
    pub token_account_maker: Account<'info, TokenAccount>,

    #[account(
        // it's complicated create this client-side since you have to use the 
        // seeds for `otc_offer` below to point the authority to `otc_offer`.
        // just let Anchor create this account
        init,
        payer = maker,
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
    // this is needed for `contract_token_account` since we are initializing 
    // a TokenAccount for the contract
    pub associated_token_program: Program<'info, AssociatedToken>,
}

#[derive(InitSpace)]
#[account]
pub struct OtcOffer {
    pub maker: Pubkey,
    // address of the taker. Only the taker can claim the tokens.
    pub taker: Pubkey,
    pub token_mint_a: Pubkey,
    pub token_a_amount: u64,
    pub token_mint_b: Pubkey,
    pub token_b_amount: u64,

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

    // @todo does the maker need to be mutable? I thought only its TokenAccount is mutable
    // we need to pass maker in because token_b will be transferred (mutated)
    #[account(mut)]
    pub maker: SystemAccount<'info>,

    pub token_mint_a: Account<'info, Mint>,
    pub token_mint_b: Account<'info, Mint>,

    #[account(
        constraint = otc_offer.maker == maker.key(),
        constraint = otc_offer.taker == taker.key(),
        constraint = otc_offer.token_mint_a == token_mint_a.key(),
        constraint = otc_offer.token_mint_b == token_mint_b.key(),
        // note init is not a constraint, so this just verifies that account passed in
        // is the correct PDA
        seeds = [b"otc_offer", otc_offer.maker.key().as_ref(), otc_offer.id_seed.to_le_bytes().as_ref()],
        bump = otc_offer.bump,
    )]
    pub otc_offer: Account<'info, OtcOffer>,

    #[account(
        mut,
        associated_token::mint = token_mint_a,
        associated_token::authority = otc_offer,
        associated_token::token_program = token_program
    )]
    pub contract_token_account: Account<'info, TokenAccount>,

    // @todo add init_if_needed constraint to (some) accounts below

    // needs taker account for token b (for transfer to a)
    #[account(
        mut,
        associated_token::mint = token_mint_b,
        associated_token::authority = taker,
        associated_token::token_program = token_program
    )]
    pub token_account_taker_b: Account<'info, TokenAccount>,

    // needs maker account for token b (for taker to transfer to)
    #[account(
        mut,
        associated_token::mint = token_mint_b,
        associated_token::authority = maker,
        associated_token::token_program = token_program
    )]
    pub token_account_maker_b: Account<'info, TokenAccount>,

    // needs taker account for token a (for contract to transfer to taker)
    #[account(
        mut,
        associated_token::mint = token_mint_a,
        associated_token::authority = taker,
        associated_token::token_program = token_program
    )]
    pub token_account_taker_a: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}
