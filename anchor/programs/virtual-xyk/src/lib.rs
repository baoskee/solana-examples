use anchor_lang::prelude::*;
use anchor_lang::solana_program::rent::{
    DEFAULT_EXEMPTION_THRESHOLD, DEFAULT_LAMPORTS_PER_BYTE_YEAR,
};
use anchor_lang::system_program::{transfer as system_transfer, Transfer as SystemTransfer};
use anchor_spl::{
    token_2022::Token2022,
    token_interface::{
        mint_to, token_metadata_initialize, Mint, MintTo, TokenAccount, TokenMetadataInitialize,
    },
};
use spl_token_metadata_interface::state::TokenMetadata;
use spl_type_length_value::variable_len_pack::VariableLenPack;

declare_id!("AxqJANBzF2LxPQDh33jVSRut8Tsnq5Ag5iDwVg7st9CN");

#[program]
pub mod virtual_xyk {

    use super::*;

    // 1. Create token
    // 2. Mint 1 billion tokens
    // 3. Initialize curve
    pub fn initialize(
        ctx: Context<Initialize>,
        name: String,
        symbol: String,
        uri: String,
        virtual_funding_amount: u64,
    ) -> Result<()> {
        create_token(&ctx, name, symbol, uri)?;

        // 2. Mint 1 billion tokens
        let cpi_ctx = CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            MintTo {
                mint: ctx.accounts.token_mint.to_account_info(),
                to: ctx.accounts.token_vault.to_account_info(),
                authority: ctx.accounts.signer.to_account_info(),
            },
        );
        mint_to(cpi_ctx, 1_000_000_000_000_000_000)?;

        // 3. Initialize curve
        ctx.accounts.curve.set_inner(Curve {
            token_amount: 1_000_000_000_000_000_000, // 1 billion in lamports
            funding_amount: 0,
            virtual_funding_amount,
            token_mint: ctx.accounts.token_mint.key(),
            funding_mint: ctx.accounts.funding_mint.key(),
            bump: ctx.bumps.curve,
        });

        Ok(())
    }

    pub fn buy_token(ctx: Context<BuyToken>, amount: u64) -> Result<()> {
        Ok(())
    }

    pub fn sell_token(ctx: Context<SellToken>, amount: u64) -> Result<()> {
        Ok(())
    }

    // @wip migrate liquidity to Raydium
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,
    #[account(
        init,
        payer = signer,
        mint::decimals = 9,
        mint::authority = signer,
        extensions::metadata_pointer::authority = signer,
        extensions::metadata_pointer::metadata_address = token_mint,
    )]
    pub token_mint: InterfaceAccount<'info, Mint>,
    #[account()]
    pub funding_mint: InterfaceAccount<'info, Mint>,

    #[account(
        init,
        payer = signer,
        seeds = [b"vault", token_mint.key().as_ref()],
        bump,
        token::mint = token_mint,
        token::authority = token_vault,
    )]
    pub token_vault: InterfaceAccount<'info, TokenAccount>,

    #[account(
        init,
        payer = signer,
        space = 8 + Curve::INIT_SPACE,
        seeds = [b"curve".as_ref(), token_mint.key().as_ref()],
        bump
    )]
    pub curve: Account<'info, Curve>,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token2022>,
}

#[derive(Accounts)]
pub struct BuyToken<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,
    // @wip
}

#[derive(Accounts)]
pub struct SellToken<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,
    // @wip
}

#[account]
#[derive(InitSpace)]
pub struct Curve {
    pub token_amount: u64,
    pub funding_amount: u64,
    pub virtual_funding_amount: u64,

    pub token_mint: Pubkey,
    pub funding_mint: Pubkey,
    pub bump: u8,
}

impl Curve {
    pub fn token_out(&self, funding_in: u64) -> u64 {
        let k = (self.virtual_funding_amount + self.funding_amount) * self.token_amount;
        let denominator = self.virtual_funding_amount + self.funding_amount + funding_in;
        self.token_amount - (k / denominator)
    }

    pub fn funding_out(&self, token_in: u64) -> u64 {
        let numerator = self.token_amount * (self.virtual_funding_amount + self.funding_amount);
        let denominator = self.token_amount + token_in;
        let funding_out =
            self.virtual_funding_amount + self.funding_amount - (numerator / denominator);
        funding_out
    }
}

// MARK: - Helpers
pub fn create_token(
    ctx: &Context<Initialize>,
    name: String,
    symbol: String,
    uri: String,
) -> Result<()> {
    let token_metadata = TokenMetadata {
        name: name.clone(),
        symbol: symbol.clone(),
        uri: uri.clone(),
        ..Default::default()
    };

    // Add 4 extra bytes for size of MetadataExtension (2 bytes for type, 2 bytes for length)
    let data_len = 4 + token_metadata.get_packed_len()?;
    // Calculate lamports required for the additional metadata
    let lamports =
        data_len as u64 * DEFAULT_LAMPORTS_PER_BYTE_YEAR * DEFAULT_EXEMPTION_THRESHOLD as u64;
    // transfer additional lamports to the mint account
    system_transfer(
        CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            SystemTransfer {
                from: ctx.accounts.signer.to_account_info(),
                to: ctx.accounts.token_mint.to_account_info(),
            },
        ),
        lamports,
    )?;
    let ctx = CpiContext::new(
        ctx.accounts.token_program.to_account_info(),
        TokenMetadataInitialize {
            token_program_id: ctx.accounts.token_program.to_account_info(),
            mint: ctx.accounts.token_mint.to_account_info(),
            metadata: ctx.accounts.token_mint.to_account_info(),
            mint_authority: ctx.accounts.signer.to_account_info(),
            update_authority: ctx.accounts.signer.to_account_info(),
        },
    );
    token_metadata_initialize(ctx, name, symbol, uri)?;
    Ok(())
}
