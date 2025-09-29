//-------------------------------------------------------------------------------
///
/// TASK: Implement the withdraw functionality for the on-chain vault
/// 
/// Requirements:
/// - Verify that the vault is not locked
/// - Verify that the vault has enough balance to withdraw
/// - Transfer lamports from vault to vault authority
/// - Emit a withdraw event after successful transfer
/// 
///-------------------------------------------------------------------------------
use anchor_lang::prelude::*;
use crate::state::Vault;
use crate::errors::VaultError;
use crate::events::WithdrawEvent;

#[derive(Accounts)]
pub struct Withdraw<'info> {
    #[account(mut)]
    pub vault_authority: Signer<'info>,
    #[account(
        mut,
        seeds = [b"vault", vault_authority.key().as_ref()],
        bump
    )]
    pub vault: Account<'info, Vault>,
}

pub fn _withdraw(ctx: Context<Withdraw>, amount: u64) -> Result<()> {
    let vault = &mut ctx.accounts.vault;
    let vault_authority = &ctx.accounts.vault_authority;
    
    // Verify that the vault is not locked
    if vault.locked {
        return Err(VaultError::VaultLocked.into());
    }
    
    // Verify that the vault has enough balance to withdraw
    let vault_balance = vault.to_account_info().lamports();
    if vault_balance < amount {
        return Err(VaultError::InsufficientBalance.into());
    }
    
    // Transfer lamports from vault to vault authority
    let vault_lamports = vault.to_account_info().lamports();
    **vault.to_account_info().try_borrow_mut_lamports()? = vault_lamports
        .checked_sub(amount)
        .ok_or(VaultError::InsufficientBalance)?;
    
    let authority_lamports = vault_authority.to_account_info().lamports();
    **vault_authority.to_account_info().try_borrow_mut_lamports()? = authority_lamports
        .checked_add(amount)
        .unwrap();
    
    // Emit a withdraw event after successful transfer
    emit!(WithdrawEvent {
        vault_authority: vault_authority.key(),
        vault: vault.key(),
        amount,
    });
    
    Ok(())
}
