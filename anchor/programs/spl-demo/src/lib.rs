use anchor_lang::prelude::*;

declare_id!("2AvdcjV1eA45F98Uo1iN6CDG8QThTUPi7Rmn6nHSCET6");

#[program]
pub mod spl_demo {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        msg!("Greetings from: {:?}", ctx.program_id);
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}
