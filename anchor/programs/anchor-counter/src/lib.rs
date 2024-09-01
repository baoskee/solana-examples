use anchor_lang::prelude::*;

declare_id!("8sbbinVKBHTxWBd1oDrjUnHY9GqB2QJJq4YeUdPnnVM6");

#[program]
pub mod anchor_counter {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>, data: Option<u64>) -> Result<()> {
        let counter = &mut ctx.accounts.counter;
        counter.count = data.unwrap_or(0);
        Ok(())
    }

    pub fn increment(ctx: Context<Update>) -> Result<()> {
        let counter = &mut ctx.accounts.counter;
        counter.count += 1;
        Ok(())
    }

    pub fn decrement(ctx: Context<Update>) -> Result<()> {
        let counter = &mut ctx.accounts.counter;
        counter.count -= 1;
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(init, payer = user, space = 8 + 8)]
    pub counter: Account<'info, Counter>,
    #[account(mut)]
    pub user: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Update<'info> {
    #[account(mut)]
    pub counter: Account<'info, Counter>,
}

#[account]
pub struct Counter {
    pub count: u64,
}

#[cfg(test)]
mod tests {
    use anchor_lang::InstructionData;
    use solana_program_test::*;
    use solana_sdk::{instruction::Instruction, signer::{keypair::Keypair, Signer}};
    use crate::{instruction, Counter};
    use super::*;

    #[tokio::test]
    async fn test_initialize() {
        let test = ProgramTest::new("anchor_counter", crate::ID, None);
        let (mut banks_client, payer, _) = test.start().await;

        let account = Keypair::new();
        // Create the initialize instruction
        let ix = instruction::Initialize {
            data: Some(1),
        };

        // Build and send the transaction
        let tx = solana_sdk::transaction::Transaction::new_signed_with_payer(
            &[Instruction::new_with_bytes(
                crate::ID,
                &ix.data(),
                vec![
                    AccountMeta::new(account.pubkey(), false),
                    AccountMeta::new(payer.pubkey(), true),
                    AccountMeta::new_readonly(solana_sdk::system_program::ID, false),
                ],
            )],
            Some(&payer.pubkey()),
            &[&payer, &account],
            banks_client.get_latest_blockhash().await.unwrap(),
        );

        banks_client.process_transaction(tx).await.unwrap();

        // Fetch the created account
        let counter_account = banks_client
            .get_account(account.pubkey())
            .await
            .expect("Failed to fetch counter account")
            .expect("Counter account not found");

        // Deserialize the account data
        let counter_data = Counter::try_deserialize(&mut counter_account.data.as_ref()).unwrap();

        // Check that the counter was initialized to 0
        assert_eq!(counter_data.count, 1);
    } 

}
