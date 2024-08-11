use borsh::{BorshDeserialize, BorshSerialize};
use solana_program::{
    account_info::{next_account_info, AccountInfo}, 
    entrypoint, 
    entrypoint::ProgramResult, 
    pubkey::Pubkey,
    program_error::ProgramError,
};

entrypoint!(process_instruction);

#[derive(BorshSerialize, BorshDeserialize, Debug)]
pub struct Counter {
    pub count: u32,
}

pub fn process_instruction(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    instruction_data: &[u8],
) -> ProgramResult {
    let accounts_iter = &mut accounts.iter();
    let account = next_account_info(accounts_iter)?;

    if account.owner != program_id {
        return Err(ProgramError::IncorrectProgramId);
    }

    let mut counter = Counter::try_from_slice(&account.data.borrow())?;
    let increment = u32::try_from_slice(instruction_data).map_err(|_| ProgramError::InvalidInstructionData)?;
    counter.count += increment;
    counter.serialize(&mut &mut account.data.borrow_mut()[..])?;

    Ok(())
}
