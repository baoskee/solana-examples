
build: 
  cargo clean
  cargo build-spf

# make sure solana-test-validator is running locally
# and RPC is set to local
deploy: 
  solana program deploy ./counter-program/target/deploy/counter_program.so  
