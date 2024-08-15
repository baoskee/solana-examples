use anchor_lang::prelude::*;

declare_id!("LRxvkSm156Rk7CBss2vrYdBPXDnKXmJzgnjuYYtGZ1L");

#[program]
pub mod reviews_variable_len {
    use super::*;

    pub fn add_movie_review(
        ctx: Context<AddMovieReview>,
        title: String, // title of movie
        description: String,
        rating: u8, 
    ) -> Result<()> {
        require!(rating >= 1 && rating <= 5, MovieReviewError::InvalidRating);
        require!(title.len() <= 20, MovieReviewError::TitleTooLong);
        require!(description.len() <= 50, MovieReviewError::DescriptionTooLong);
        
        ctx.accounts.movie_review.set_inner(MovieAccountState {
            reviewer: ctx.accounts.reviewer.key(),
            rating,
            title,
            description,
        });
        Ok(())
    }

    pub fn update_movie_review(
        ctx: Context<UpdateMovieReview>,
        title: String,
        description: String,
        rating: u8,
    ) -> Result<()> {
        require!(rating >= 1 && rating <= 5, MovieReviewError::InvalidRating);
        require!(title.len() <= 20, MovieReviewError::TitleTooLong);
        require!(description.len() <= 50, MovieReviewError::DescriptionTooLong);

        // title cannot be updated
        ctx.accounts.movie_review.rating = rating;
        ctx.accounts.movie_review.description = description;
        Ok(())
    }

    pub fn delete_movie_review(
        _ctx: Context<DeleteMovieReview>,
        title: String,
    ) -> Result<()> {
        // see close attribute in the account definition
        // can also close account this way
        // _ctx.accounts.movie_review.close(_ctx.accounts.reviewer.to_account_info())?;
        msg!("Deleting/closing movie review for title: {}", title);
        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(title: String, description: String)]
pub struct AddMovieReview<'info> {
    #[account(mut)]
    pub reviewer: Signer<'info>,
    #[account(
        init,
        payer = reviewer,
        space = 8 + MovieAccountState::INIT_SPACE + title.len() + description.len(),
        seeds = [title.as_bytes(), reviewer.key().as_ref()],
        bump
    )]
    pub movie_review: Account<'info, MovieAccountState>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(title: String, description: String)]
pub struct UpdateMovieReview<'info> {
    #[account(mut)]
    pub reviewer: Signer<'info>,
    #[account(
        mut, 
        has_one = reviewer, // only the reviewer can update the review
        seeds = [title.as_bytes(), reviewer.key().as_ref()],
        bump,
        realloc = 8 + MovieAccountState::INIT_SPACE + title.len() + description.len(),
        realloc::payer = reviewer,
        realloc::zero = true, // new space must be zeroed
    )]
    pub movie_review: Account<'info, MovieAccountState>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(title: String)]
pub struct DeleteMovieReview<'info> {
    #[account(mut)]
    pub reviewer: Signer<'info>,
    #[account(
        mut, 
        has_one = reviewer, 
        seeds = [title.as_bytes(), reviewer.key().as_ref()],
        bump,
        close = reviewer
    )]
    pub movie_review: Account<'info, MovieAccountState>,
    pub system_program: Program<'info, System>,
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
