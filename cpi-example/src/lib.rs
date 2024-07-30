use std::str::FromStr;

use solana_program::{
    account_info::{next_account_info, AccountInfo},
    entrypoint,
    entrypoint::ProgramResult,
    instruction::{AccountMeta, Instruction},
    program::invoke,
    program_error::ProgramError,
    pubkey::Pubkey,
};

entrypoint!(process_instruction);

// Change this to the program id of the counter program you deployed
const COUNTER_PROGRAM_ID: &str = "2cKLoe4iAnBjDWb31oJ9eggLpPW3qCLr8dQ9LdKB7719";

// Should be owned by the program ID above, and allocated 4 bytes
// Change this to the counter account you created with Program ID deployed
const COUNTER_ACCOUNT: &str = "HKc9q4rJVCUSnrYrFEGCYCG79iFdBcniyLFaJ5fC15Ce";

pub fn process_instruction(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    _instruction_data: &[u8],
) -> ProgramResult {
    let accounts_iter = &mut accounts.iter();
    let account = next_account_info(accounts_iter)?;

    if account.owner != program_id {
        return Err(ProgramError::IncorrectProgramId);
    }

    let increment_by_7_inst = Instruction {
        program_id: Pubkey::from_str(COUNTER_PROGRAM_ID).unwrap(),
        accounts: vec![AccountMeta {
            pubkey: Pubkey::from_str(COUNTER_ACCOUNT).unwrap(),
            is_signer: false,
            is_writable: true,
        }],
        data: vec![7],
    };

    invoke(&increment_by_7_inst, &[account.clone()])?;

    Ok(())
}
