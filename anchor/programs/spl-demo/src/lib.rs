use anchor_lang::prelude::*;
use anchor_lang::solana_program::rent::{
    DEFAULT_EXEMPTION_THRESHOLD, DEFAULT_LAMPORTS_PER_BYTE_YEAR,
};
use anchor_spl::{
    associated_token::AssociatedToken,
    token_interface::{
        mint_to, token_metadata_initialize, transfer_checked, Mint, MintTo, Token, Token2022, TokenAccount,
        TokenMetadataInitialize, Transfer, TokenMetadata,
    },
};
use spl_token_metadata_interface::state::TokenMetadata;
use spl_type_length_value::variable_len_pack::VariableLenPack;

use anchor_lang::solana_program::system_program::{
    transfer as system_transfer, Transfer as SystemTransfer,
};

declare_id!("2AvdcjV1eA45F98Uo1iN6CDG8QThTUPi7Rmn6nHSCET6");

#[program]
pub mod spl_demo {
    use super::*;

    // MARK: - Initialize

    // 1. create token with metadata
    // 2. mint `mint_a` tokens to vault
    // 3. set state
    pub fn initialize(
        ctx: Context<Initialize>,
        token_name: String,
        token_symbol: String,
        token_uri: String,
        mint_amount: u64, // in lamports
    ) -> Result<()> {
        let token_metadata = TokenMetadata {
            name: token_name.clone(),
            symbol: token_symbol.clone(),
            uri: token_uri.clone(),
            ..Default::default()
        };
        // Add 4 extra bytes for size of MetadataExtension (2 bytes for type, 2 bytes for length)
        let data_len = 4 + token_metadata.get_packed_len()?;
        // Calculate lamports required for the additional metadata
        let lamports =
            data_len as u64 * DEFAULT_LAMPORTS_PER_BYTE_YEAR * DEFAULT_EXEMPTION_THRESHOLD as u64;

        // Transfer additional lamports to mint account
        system_transfer(
            CpiContext::new(
                ctx.accounts.system_program.to_account_info(),
                SystemTransfer {
                    from: ctx.accounts.payer.to_account_info(),
                    to: ctx.accounts.mint_a.to_account_info(),
                },
            ),
            lamports,
        )?;

        // 1. Invoking the create_metadata_account_v3 instruction on the token metadata program
        let cpi_context = CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            TokenMetadataInitialize {
                token_program_id: ctx.accounts.token_program.key(),
                mint: ctx.accounts.mint_a.to_account_info(),
                metadata: ctx.accounts.mint_a.to_account_info(),
                mint_authority: ctx.accounts.mint_a.to_account_info(),
                update_authority: ctx.accounts.mint_a.to_account_info(),
            },
        );

        token_metadata_initialize(cpi_context, token_name, token_symbol, token_uri)?;

        let mint_a_key = ctx.accounts.mint_a.key();
        let signer_seeds: &[&[&[u8]]] = &[&[b"state", mint_a_key.as_ref(), &[ctx.bumps.state]]];
        // 2. mint `mint_a` tokens to vault
        let mint_cpi = CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            MintTo {
                mint: ctx.accounts.mint_a.to_account_info(),
                to: ctx.accounts.vault_a.to_account_info(),
                authority: ctx.accounts.mint_a.to_account_info(),
            },
        )
        .with_signer(signer_seeds);

        mint_to(mint_cpi, mint_amount)?;

        // 3. set state
        ctx.accounts.state.set_inner(State {
            mint_a: ctx.accounts.mint_a.key(),
            mint_b: ctx.accounts.mint_b_funding.key(),
            a_distributed_amount: 0,
        });

        Ok(())
    }

    // MARK: - Redeem

    // @assume mint_a token has SAME PRECISION as mint_b token
    // 1. transfer funding tokens to contract
    // 2. transfer `mint_a` tokens from vault to user
    // 3. update state
    pub fn redeem(ctx: Context<Redeem>, amount: u64) -> Result<()> {
        // 1. transfer funding tokens to contract
        let transfer_cpi = CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.payer_ata_b.to_account_info(),
                to: ctx.accounts.vault_b.to_account_info(),
                authority: ctx.accounts.payer.to_account_info(),
            },
        );
        transfer_checked(transfer_cpi, amount, ctx.accounts.mint_b.decimals)?;

        // 2. transfer `mint_a` tokens from vault to user
        let mint_a_key = ctx.accounts.mint_a.key();
        let signer_seeds: &[&[&[u8]]] = &[&[b"state", mint_a_key.as_ref(), &[ctx.bumps.state]]];
        let transfer_cpi = CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.vault_a.to_account_info(),
                to: ctx.accounts.payer_ata_a.to_account_info(),
                authority: ctx.accounts.mint_a.to_account_info(),
            },
        )
        .with_signer(signer_seeds);
        transfer_checked(transfer_cpi, amount, ctx.accounts.mint_a.decimals)?;

        // 3. update state
        let state = &mut ctx.accounts.state;
        state.a_distributed_amount += amount;

        Ok(())
    }
}

// MARK: - Initialize accounts

#[derive(Accounts)]
#[instruction(token_name: String, token_symbol: String, token_uri: String)]
pub struct Initialize<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    // Create mint account
    #[account(
        init,
        payer = payer,
        mint::decimals = 9,
        // tune this to your liking
        mint::authority = mint_a.key(),
        mint::freeze_authority = mint_a.key(),
        extensions::metadata_pointer::authority = mint_a.key(),
        extensions::metadata_pointer::metadata_address = mint_a.key(),
    )]
    pub mint_a: InterfaceAccount<'info, Mint>,

    #[account(
        init,
        payer = payer,
        space = 8 + State::INIT_SPACE,
        seeds = [b"state".as_ref(), mint_a.key().as_ref()],
        bump
    )]
    pub state: Account<'info, State>,

    #[account(
        init,
        payer = payer,
        associated_token::mint = mint_a,
        associated_token::authority = state,
    )]
    // needs to mint tokens to this account to start
    pub vault_a: InterfaceAccount<'info, TokenAccount>,

    // funding mint for the token contract accepts
    pub mint_b_funding: InterfaceAccount<'info, Mint>,

    // system programs
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token2022>,
    pub associated_token_program: Program<'info, AssociatedToken>,
}

// MARK: - Redeem accounts

#[derive(Accounts)]
pub struct Redeem<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account()]
    pub mint_a: InterfaceAccount<'info, Mint>,
    #[account()]
    pub mint_b: InterfaceAccount<'info, Mint>,

    #[account(
        mut,
        seeds = [b"state".as_ref(), mint_a.key().as_ref()],
        bump,
        has_one = mint_a,
        has_one = mint_b,
    )]
    pub state: Account<'info, State>,

    #[account(
        mut,
        associated_token::mint = mint_a,
        associated_token::authority = state,
    )]
    pub vault_a: InterfaceAccount<'info, TokenAccount>,
    #[account(
        mut,
        associated_token::mint = mint_b,
        associated_token::authority = state,
    )]
    pub vault_b: InterfaceAccount<'info, TokenAccount>,

    #[account(
        mut,
        associated_token::mint = mint_b,
        associated_token::authority = payer,
    )]
    pub payer_ata_b: InterfaceAccount<'info, TokenAccount>,

    #[account(
        mut,
        associated_token::mint = mint_a,
        associated_token::authority = payer,
    )]
    pub payer_ata_a: InterfaceAccount<'info, TokenAccount>,

    pub token_program: Program<'info, TokenInterface>,
}

// MARK: - State

#[account]
#[derive(InitSpace)]
pub struct State {
    pub mint_a: Pubkey,
    pub mint_b: Pubkey,
    pub a_distributed_amount: u64,
}
