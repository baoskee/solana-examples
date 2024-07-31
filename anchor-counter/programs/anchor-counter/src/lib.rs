use anchor_lang::prelude::*;

declare_id!("8rK93pjtsMfxvLayRD8Ypa9YJCursWoCT7379KTJtzxb");

#[program]
pub mod anchor_counter {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}
