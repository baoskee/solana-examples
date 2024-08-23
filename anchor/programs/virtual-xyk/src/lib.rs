use anchor_lang::prelude::*;
use anchor_spl::token_interface::{Mint, TokenAccount};

declare_id!("AxqJANBzF2LxPQDh33jVSRut8Tsnq5Ag5iDwVg7st9CN");

#[program]
pub mod virtual_xyk {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        msg!("Greetings from: {:?}", ctx.program_id);
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
    #[account(mut)]
    pub token_mint: InterfaceAccount<'info, Mint>,

    #[account(mut)]
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
