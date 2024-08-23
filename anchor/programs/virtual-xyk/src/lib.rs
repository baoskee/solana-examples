use anchor_lang::prelude::*;

declare_id!("AxqJANBzF2LxPQDh33jVSRut8Tsnq5Ag5iDwVg7st9CN");

#[program]
pub mod virtual_xyk {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        msg!("Greetings from: {:?}", ctx.program_id);
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}
