use anchor_lang::prelude::*;

declare_id!("5TBggU5sCesWSqkSc44xzKZwhM8FRT4KhTMXK1LoerJG");

#[program]
pub mod puppet {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        msg!("Greetings from: {:?}", ctx.program_id);
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}
