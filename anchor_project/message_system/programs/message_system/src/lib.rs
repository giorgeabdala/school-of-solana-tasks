use anchor_lang::prelude::*;

declare_id!("6B8ebKA127zHwfjk8BEv1UT6KUeri6vBtAf46uNzBN5H");

#[program]
pub mod message_system {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        let global_state = &mut ctx.accounts.global_state;
        global_state.message_count = 0;
        global_state.authority = ctx.accounts.authority.key();
        
        msg!("Message system initialized with authority: {:?}", global_state.authority);
        Ok(())
    }

    pub fn post_message(ctx: Context<PostMessage>, content: String) -> Result<()> {
        // Validate message length
        require!(content.len() <= 280, MessageError::MessageTooLong);
        require!(!content.trim().is_empty(), MessageError::EmptyMessage);

        let global_state = &mut ctx.accounts.global_state;
        let message = &mut ctx.accounts.message;
        let clock = Clock::get()?;

        // Set message data
        message.id = global_state.message_count;
        message.author = ctx.accounts.author.key();
        message.content = content;
        message.timestamp = clock.unix_timestamp;

        // Increment global counter
        global_state.message_count = global_state.message_count.checked_add(1).ok_or(MessageError::Overflow)?;

        msg!(
            "Message posted by {:?}: {}",
            message.author,
            message.content
        );

        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + 8 + 32,
        seeds = [b"global"],
        bump
    )]
    pub global_state: Account<'info, GlobalState>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct PostMessage<'info> {
    #[account(mut, seeds = [b"global"], bump)]
    pub global_state: Account<'info, GlobalState>,
    
    #[account(
        init,
        payer = author,
        space = 8 + 8 + 32 + 4 + 280 + 8, // discriminator + id + pubkey + string_len + content + timestamp
        seeds = [b"message", author.key().as_ref(), global_state.message_count.to_le_bytes().as_ref()],
        bump
    )]
    pub message: Account<'info, Message>,
    
    #[account(mut)]
    pub author: Signer<'info>,
    pub system_program: Program<'info, System>,
}

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

#[error_code]
pub enum MessageError {
    #[msg("Message content exceeds 280 characters")]
    MessageTooLong,
    #[msg("Message content cannot be empty")]
    EmptyMessage,
    #[msg("Numeric overflow")]
    Overflow,
}
