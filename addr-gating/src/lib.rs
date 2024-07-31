use borsh::{BorshDeserialize, BorshSerialize};
use solana_program::{
    account_info::{next_account_info, AccountInfo},
    entrypoint,
    entrypoint::ProgramResult,
    program_error::ProgramError,
    pubkey::Pubkey,
};

entrypoint!(process_instruction);

#[derive(BorshSerialize, BorshDeserialize, Debug)]
pub struct State {
    pub count: u32,
    pub address: Pubkey,
}

#[derive(BorshSerialize, BorshDeserialize, Debug)]
pub enum Instruction {
    Initialize { address: Pubkey },
    Increment { increment: u32 },
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

    let mut state = State::try_from_slice(&account.data.borrow())?;
    let instruction = Instruction::try_from_slice(instruction_data)
        .map_err(|_| ProgramError::InvalidInstructionData)?;

    match instruction {
        Instruction::Initialize { address } => {
            state.count = 0;
            state.address = address;
        }
        Instruction::Increment { increment } => {
            // 1st account is data account, second must be authorized incrementer
            let account = next_account_info(accounts_iter)?;
            if !account.is_signer {
                return Err(ProgramError::MissingRequiredSignature);
            }
            if state.address != *account.key {
                return Err(ProgramError::InvalidAccountData);
            }

            state.count += increment;
        }
    }

    state.serialize(&mut &mut account.data.borrow_mut()[..])?;
    Ok(())
}
