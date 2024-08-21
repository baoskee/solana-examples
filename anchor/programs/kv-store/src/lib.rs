use anchor_lang::prelude::*;

declare_id!("9K8fZ2ZFgyjtUr9tJkDgwAPcs6wCjpHBLrh989JeevB9");

#[program]
pub mod kv_store {
    use super::*;

    pub fn set_value(ctx: Context<SetValue>, _id: u64, _key: String, value: String) -> Result<()> {
        ctx.accounts.kv_store.set_inner(KvStore { value });
        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(id: u64, key: String)]
pub struct SetValue<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,

    #[account(
        init_if_needed,
        payer = signer,
        space = 8 + KvStore::INIT_SPACE,
        seeds = [b"kv_store", signer.key().as_ref(), id.to_le_bytes().as_ref(), key.as_bytes()],
        bump
    )]
    pub kv_store: Account<'info, KvStore>,

    pub system_program: Program<'info, System>,
}

#[account]
#[derive(InitSpace)]
pub struct KvStore {
    #[max_len(32)]
    pub value: String,
}
