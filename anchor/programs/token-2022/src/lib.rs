use anchor_lang::prelude::*;

declare_id!("QJqxGatfoyyHgeuxNgur5EWETdXGzYx2hBkdtrbT2gZ");

#[program]
pub mod token_2022 {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        msg!("Greetings from: {:?}", ctx.program_id);
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}
