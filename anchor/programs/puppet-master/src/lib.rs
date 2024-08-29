use anchor_lang::prelude::*;

declare_id!("F4YurBauRjWpHpynNZhARWezDoDc2wLCWTjoihe338Ck");

#[program]
pub mod puppet_master {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        msg!("Greetings from: {:?}", ctx.program_id);
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}
