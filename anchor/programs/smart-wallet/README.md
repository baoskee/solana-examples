
# Introduction
A simple smart wallet program that allows for executing instructions on behalf of the authority.

## Idea
Everytime it interacts with SPL token program, it can check whether
the token is part of the token whitelist. If it is, it will execute the instruction.

You can perform checks on instructions to ensure:
- Program ID is whitelisted
- Token mint is whitelisted if it is an SPL Program ID
- Various pre- and post-instruction checks
- Fee payment on SPL token transfers
