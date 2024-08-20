keypair_path := '/Users/bao/.config/solana/id.json'

# make sure solana-test-validator is running locally
# and RPC is set to local
build program: 
  cd anchor && anchor build -p {{program}}

# if space not big enough do 
# `solana program extend <program_id> <space_in_bytes>`
deploy program:
  cd anchor && anchor deploy -p {{program}}

# MARK: - SPL 2022

create-spl:
  spl-token --program-id TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb create-token --enable-close

# To see all token accounts you have: 
# `spl-token accounts`

# To display token info: 
# `spl-token display <token_address>`

# To get keypair being used: 
# `solana config get`

# for metadata program: 
# solana program dump -u m metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s metaplex.so
# solana-test-validator -r --bpf-program metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s metaplex.so

mint token_addr amount:
  spl-token create-account {{token_addr}} || true
  spl-token mint {{token_addr}} {{amount}}

transfer token_addr amount recipient:
  spl-token create-account {{token_addr}} --owner {{recipient}} \
    --fee-payer {{keypair_path}} 2>/dev/null || true 
  spl-token transfer {{token_addr}} {{amount}} {{recipient}} 

ata token wallet: 
  spl-token address --token {{token}} --owner {{wallet}} --verbose
