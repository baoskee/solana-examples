use anchor_lang::prelude::*;

declare_id!("LRxvkSm156Rk7CBss2vrYdBPXDnKXmJzgnjuYYtGZ1L");

#[program]
pub mod reviews_variable_len {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        msg!("Greetings from: {:?}", ctx.program_id);
        Ok(())
    }

}

#[derive(Accounts)]
pub struct Initialize {

}

#[account]
pub struct MovieAccountState {
    pub reviewer: Pubkey, // 32
    pub rating: u8, // 1
    pub title: String, // 4 + len()
    pub description: String, // 4 + len()
}

impl Space for MovieAccountState {
    const INIT_SPACE: usize = 32 + 1 + 4 + 4;
}

#[error_code]
enum MovieReviewError {
    #[msg("Rating must be between 1 and 5")]
    InvalidRating,
    #[msg("Movie Title too long")]
    TitleTooLong,
    #[msg("Movie Description too long")]
    DescriptionTooLong,
}
