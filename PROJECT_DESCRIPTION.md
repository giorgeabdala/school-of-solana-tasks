# Project Description

**Deployed Frontend URL:** https://solana-message-system-3mk9vuoip-giorgeabdalas-projects.vercel.app

**Solana Program ID:** `6B8ebKA127zHwfjk8BEv1UT6KUeri6vBtAf46uNzBN5H`

## Project Overview

This project is a decentralized message system on the Solana blockchain. It allows users to post public messages of up to 280 characters, which are stored on-chain. The dApp uses PDAs to create unique addresses for each message and tracks the total message count.

### Key Features
- Post public messages (max 280 characters).
- Global counter for all messages.
- Unique message addresses using PDAs.
- Timestamps for each message.
- Phantom wallet integration.
- View all posted messages.

### How to Use
1.  Connect your Phantom wallet.
2.  If it's the first time anyone uses the dApp, click "Initialize System" to set up the global state.
3.  Type a message and click "Post Message".
4.  View messages on the main page.

## Program Architecture

The program has two main instructions (`initialize` and `post_message`) and uses two account types. PDAs are used for deterministic state management.

### PDA Usage
- **Global State PDA**: `[b"global"]` - This PDA stores the global message counter. Using a static seed ensures there is only one global state account for the program.
- **Message PDA**: `[b"message", author_pubkey, message_id]` - Each message has a unique address derived from the author's public key and the current message count, ensuring deterministic addresses.

### Program Instructions
- **initialize**: Sets up the `GlobalState` account, initializing the message counter to 0. It can only be called once.
- **post_message**: Creates a new `Message` account. It validates that the message is not empty and is under 280 characters. It then increments the global counter.

### Account Structure

```rust
#[account]
pub struct GlobalState {
    pub message_count: u64,
    pub authority: Pubkey,
}

#[account]
pub struct Message {
    pub id: u64,
    pub author: Pubkey,
    pub content: String,
    pub timestamp: i64,
}
```

**Account Space Calculation:**
- GlobalState: 48 bytes
- Message: 340 bytes

## Testing

The test suite covers both successful operations and error conditions to ensure the program behaves as expected.

**Happy Path Tests:**
- Successful system initialization.
- Posting the first message.
- Posting multiple sequential messages.
- Verifying data integrity of posted messages.

**Unhappy Path Tests:**
- Attempting to re-initialize the global state.
- Posting a message longer than 280 characters.
- Posting an empty message.
- Using incorrect PDA seeds.

All tests are passing.

### Running Tests
```bash
# Navigate to anchor project
cd anchor_project/message_system

# Run all tests (builds, deploys, and tests)
anchor test

# Run tests only (skip build/deploy)
anchor test --skip-build --skip-deploy
```

### Additional Notes

The program includes input validation on both the client and program side. It uses custom error codes for better error handling. The sequential message IDs from the global counter allow for easy ordering and PDA generation.
