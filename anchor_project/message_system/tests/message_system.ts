import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { MessageSystem } from "../target/types/message_system";
import { expect } from "chai";

describe("message_system", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.MessageSystem as Program<MessageSystem>;
  const provider = anchor.getProvider();

  // Test accounts
  let globalStatePda: anchor.web3.PublicKey;
  let globalStateBump: number;
  
  before(async () => {
    // Find global state PDA
    [globalStatePda, globalStateBump] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("global")],
      program.programId
    );
  });

  describe("Happy Path Tests", () => {
    it("Initializes the message system successfully", async () => {
      const tx = await program.methods
        .initialize()
        .accounts({
          globalState: globalStatePda,
          authority: provider.wallet.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc();

      console.log("Initialize transaction signature", tx);

      // Verify the global state was created correctly
      const globalState = await program.account.globalState.fetch(globalStatePda);
      expect(globalState.messageCount.toNumber()).to.equal(0);
      expect(globalState.authority.toString()).to.equal(provider.wallet.publicKey.toString());
    });

    it("Posts a message successfully", async () => {
      const messageContent = "Hello, Solana! This is my first message.";
      
      // Get current message count to generate the right PDA
      const globalStateBefore = await program.account.globalState.fetch(globalStatePda);
      const messageId = globalStateBefore.messageCount;

      // Find message PDA
      const [messagePda] = anchor.web3.PublicKey.findProgramAddressSync(
        [
          Buffer.from("message"),
          provider.wallet.publicKey.toBuffer(),
          messageId.toBuffer("le", 8),
        ],
        program.programId
      );

      const tx = await program.methods
        .postMessage(messageContent)
        .accounts({
          globalState: globalStatePda,
          message: messagePda,
          author: provider.wallet.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc();

      console.log("Post message transaction signature", tx);

      // Verify the message was created correctly
      const message = await program.account.message.fetch(messagePda);
      expect(message.id.toNumber()).to.equal(0);
      expect(message.author.toString()).to.equal(provider.wallet.publicKey.toString());
      expect(message.content).to.equal(messageContent);
      expect(message.timestamp.toNumber()).to.be.greaterThan(0);

      // Verify global counter was incremented
      const globalStateAfter = await program.account.globalState.fetch(globalStatePda);
      expect(globalStateAfter.messageCount.toNumber()).to.equal(1);
    });

    it("Posts multiple messages successfully", async () => {
      const messages = [
        "Second message here!",
        "Third message with different content.",
        "Fourth message testing counter increment."
      ];

      for (let i = 0; i < messages.length; i++) {
        const globalStateBefore = await program.account.globalState.fetch(globalStatePda);
        const messageId = globalStateBefore.messageCount;

        const [messagePda] = anchor.web3.PublicKey.findProgramAddressSync(
          [
            Buffer.from("message"),
            provider.wallet.publicKey.toBuffer(),
            messageId.toBuffer("le", 8),
          ],
          program.programId
        );

        await program.methods
          .postMessage(messages[i])
          .accounts({
            globalState: globalStatePda,
            message: messagePda,
            author: provider.wallet.publicKey,
            systemProgram: anchor.web3.SystemProgram.programId,
          })
          .rpc();

        // Verify message content
        const message = await program.account.message.fetch(messagePda);
        expect(message.content).to.equal(messages[i]);
        expect(message.id.toNumber()).to.equal(1 + i);
      }

      // Verify final counter
      const finalGlobalState = await program.account.globalState.fetch(globalStatePda);
      expect(finalGlobalState.messageCount.toNumber()).to.equal(4); // 1 + 3 new messages
    });
  });

  describe("Unhappy Path Tests", () => {
    it("Fails to reinitialize the system", async () => {
      try {
        await program.methods
          .initialize()
          .accounts({
            globalState: globalStatePda,
            authority: provider.wallet.publicKey,
            systemProgram: anchor.web3.SystemProgram.programId,
          })
          .rpc();
        
        // If we reach here, the test should fail
        expect.fail("Should have failed to reinitialize");
      } catch (error) {
        // Anchor should throw an error about account already being initialized
        expect(error.toString()).to.include("already in use");
      }
    });

    it("Fails to post a message that's too long", async () => {
      // Create a message that's longer than 280 characters
      const longMessage = "A".repeat(281);
      
      const globalStateBefore = await program.account.globalState.fetch(globalStatePda);
      const messageId = globalStateBefore.messageCount;

      const [messagePda] = anchor.web3.PublicKey.findProgramAddressSync(
        [
          Buffer.from("message"),
          provider.wallet.publicKey.toBuffer(),
          messageId.toBuffer("le", 8),
        ],
        program.programId
      );

      try {
        await program.methods
          .postMessage(longMessage)
          .accounts({
            globalState: globalStatePda,
            message: messagePda,
            author: provider.wallet.publicKey,
            systemProgram: anchor.web3.SystemProgram.programId,
          })
          .rpc();
        
        expect.fail("Should have failed with message too long error");
      } catch (error) {
        expect(error.toString()).to.include("Message content exceeds 280 characters");
      }
    });

    it("Fails to post an empty message", async () => {
      const emptyMessage = "   "; // Only whitespace
      
      const globalStateBefore = await program.account.globalState.fetch(globalStatePda);
      const messageId = globalStateBefore.messageCount;

      const [messagePda] = anchor.web3.PublicKey.findProgramAddressSync(
        [
          Buffer.from("message"),
          provider.wallet.publicKey.toBuffer(),
          messageId.toBuffer("le", 8),
        ],
        program.programId
      );

      try {
        await program.methods
          .postMessage(emptyMessage)
          .accounts({
            globalState: globalStatePda,
            message: messagePda,
            author: provider.wallet.publicKey,
            systemProgram: anchor.web3.SystemProgram.programId,
          })
          .rpc();
        
        expect.fail("Should have failed with empty message error");
      } catch (error) {
        expect(error.toString()).to.include("Message content cannot be empty");
      }
    });

    it("Fails to post message with wrong PDA seeds", async () => {
      const messageContent = "This should fail due to wrong PDA";
      
      // Use wrong message ID for PDA generation
      const wrongMessageId = new anchor.BN(999);

      const [wrongMessagePda] = anchor.web3.PublicKey.findProgramAddressSync(
        [
          Buffer.from("message"),
          provider.wallet.publicKey.toBuffer(),
          wrongMessageId.toBuffer("le", 8),
        ],
        program.programId
      );

      try {
        await program.methods
          .postMessage(messageContent)
          .accounts({
            globalState: globalStatePda,
            message: wrongMessagePda,
            author: provider.wallet.publicKey,
            systemProgram: anchor.web3.SystemProgram.programId,
          })
          .rpc();
        
        expect.fail("Should have failed with wrong PDA seeds");
      } catch (error) {
        // Should fail due to seeds constraint violation
        expect(error.toString()).to.include("seeds constraint was violated");
      }
    });
  });
});
