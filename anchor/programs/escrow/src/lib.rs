use anchor_lang::prelude::*;

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
pub struct Initialize {}
