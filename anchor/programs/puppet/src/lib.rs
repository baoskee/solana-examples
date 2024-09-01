use anchor_lang::prelude::*;

declare_id!("5TBggU5sCesWSqkSc44xzKZwhM8FRT4KhTMXK1LoerJG");

#[program]
pub mod puppet {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        msg!("Greetings from: {:?}", ctx.program_id);
        Ok(())
    }

    pub fn set_data(ctx: Context<SetData>, data: u64) -> Result<()> {
        let puppet = &mut ctx.accounts.puppet;
        msg!("pda signer: {:?}", ctx.accounts.signer.to_account_info());

        puppet.last_puppeteer = ctx.accounts.signer.key();
        puppet.data = data;
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,
    #[account(init, payer = signer, space = 8 + Data::INIT_SPACE)]
    pub puppet: Account<'info, Data>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct SetData<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,
    #[account(mut)]
    pub puppet: Account<'info, Data>,
}

#[account]
#[derive(InitSpace)]
pub struct Data {
    pub data: u64,
    pub last_puppeteer: Pubkey,
}
