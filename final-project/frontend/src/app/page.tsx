'use client'

import { useState, useEffect } from 'react'
import { useWallet, useConnection } from '@solana/wallet-adapter-react'
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'
import { PublicKey } from '@solana/web3.js'
import { Program, AnchorProvider, web3, utils, BN } from '@coral-xyz/anchor'

const PROGRAM_ID = new PublicKey('6B8ebKA127zHwfjk8BEv1UT6KUeri6vBtAf46uNzBN5H')

// Simplified IDL for the frontend
const IDL = {
  "version": "0.1.0",
  "name": "message_system",
  "instructions": [
    {
      "name": "initialize",
      "accounts": [
        {"name": "globalState", "isMut": true, "isSigner": false},
        {"name": "authority", "isMut": true, "isSigner": true},
        {"name": "systemProgram", "isMut": false, "isSigner": false}
      ],
      "args": []
    },
    {
      "name": "postMessage",
      "accounts": [
        {"name": "globalState", "isMut": true, "isSigner": false},
        {"name": "message", "isMut": true, "isSigner": false},
        {"name": "author", "isMut": true, "isSigner": true},
        {"name": "systemProgram", "isMut": false, "isSigner": false}
      ],
      "args": [
        {"name": "content", "type": "string"}
      ]
    }
  ],
  "accounts": [
    {
      "name": "GlobalState",
      "type": {
        "kind": "struct",
        "fields": [
          {"name": "messageCount", "type": "u64"},
          {"name": "authority", "type": "publicKey"}
        ]
      }
    },
    {
      "name": "Message",
      "type": {
        "kind": "struct",
        "fields": [
          {"name": "id", "type": "u64"},
          {"name": "author", "type": "publicKey"},
          {"name": "content", "type": "string"},
          {"name": "timestamp", "type": "i64"}
        ]
      }
    }
  ]
}

type Message = {
  id: BN
  author: PublicKey
  content: string
  timestamp: BN
}

export default function Home() {
  const { connection } = useConnection()
  const { publicKey, sendTransaction } = useWallet()
  const [messages, setMessages] = useState<Array<{address: PublicKey, account: Message}>>([])
  const [newMessage, setNewMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [globalState, setGlobalState] = useState<{messageCount: BN, authority: PublicKey} | null>(null)
  const [isInitialized, setIsInitialized] = useState(false)

  const getProvider = () => {
    if (!publicKey) return null
    const provider = new AnchorProvider(connection, {
      publicKey,
      signTransaction: sendTransaction as any,
      signAllTransactions: sendTransaction as any,
    }, { commitment: 'confirmed' })
    return provider
  }

  const getProgram = () => {
    const provider = getProvider()
    if (!provider) return null
    return new Program(IDL as any, PROGRAM_ID, provider)
  }

  const [globalStatePda] = PublicKey.findProgramAddressSync(
    [Buffer.from('global')],
    PROGRAM_ID
  )

  useEffect(() => {
    checkIfInitialized()
    loadMessages()
  }, [publicKey])

  const checkIfInitialized = async () => {
    try {
      const program = getProgram()
      if (!program) return

      const globalStateAccount = await program.account.globalState.fetch(globalStatePda)
      setGlobalState(globalStateAccount as any)
      setIsInitialized(true)
    } catch (error) {
      console.log('Global state not initialized yet')
      setIsInitialized(false)
    }
  }

  const initializeSystem = async () => {
    try {
      const program = getProgram()
      if (!program || !publicKey) return

      setIsLoading(true)
      const tx = await program.methods
        .initialize()
        .accounts({
          globalState: globalStatePda,
          authority: publicKey,
          systemProgram: web3.SystemProgram.programId,
        })
        .rpc()

      console.log('Initialize transaction:', tx)
      await checkIfInitialized()
    } catch (error) {
      console.error('Error initializing:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const postMessage = async () => {
    try {
      if (!newMessage.trim()) return
      
      const program = getProgram()
      if (!program || !publicKey || !globalState) return

      setIsLoading(true)
      
      const messageId = globalState.messageCount
      const [messagePda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from('message'),
          publicKey.toBuffer(),
          messageId.toArrayLike(Buffer, 'le', 8),
        ],
        PROGRAM_ID
      )

      const tx = await program.methods
        .postMessage(newMessage)
        .accounts({
          globalState: globalStatePda,
          message: messagePda,
          author: publicKey,
          systemProgram: web3.SystemProgram.programId,
        })
        .rpc()

      console.log('Post message transaction:', tx)
      setNewMessage('')
      await loadMessages()
      await checkIfInitialized()
    } catch (error) {
      console.error('Error posting message:', error)
      alert('Error posting message. Check console for details.')
    } finally {
      setIsLoading(false)
    }
  }

  const loadMessages = async () => {
    try {
      const program = getProgram()
      if (!program) return

      const messageAccounts = await program.account.message.all()
      setMessages(messageAccounts.sort((a, b) => 
        a.account.id.toNumber() - b.account.id.toNumber()
      ))
    } catch (error) {
      console.error('Error loading messages:', error)
    }
  }

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-8 text-center">
          Solana Message System
        </h1>

        <div className="mb-8 text-center">
          <WalletMultiButton />
        </div>

        {publicKey && (
          <>
            <div className="mb-8 p-6 bg-gray-100 rounded-lg">
              <h2 className="text-xl font-semibold mb-4">System Status</h2>
              
              {!isInitialized ? (
                <div>
                  <p className="mb-4 text-red-600">System not initialized yet.</p>
                  <button 
                    onClick={initializeSystem}
                    disabled={isLoading}
                    className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
                  >
                    {isLoading ? 'Initializing...' : 'Initialize System'}
                  </button>
                </div>
              ) : (
                <div className="text-green-600">
                  <p>✅ System initialized!</p>
                  <p>Messages count: {globalState?.messageCount?.toString() || '0'}</p>
                </div>
              )}
            </div>

            {isInitialized && (
              <>
                <div className="mb-8 p-6 bg-white border rounded-lg shadow">
                  <h2 className="text-xl font-semibold mb-4">Post New Message</h2>
                  <textarea
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="What's on your mind? (Max 280 characters)"
                    className="w-full p-3 border rounded-lg resize-none"
                    rows={3}
                    maxLength={280}
                  />
                  <div className="flex justify-between items-center mt-4">
                    <span className="text-sm text-gray-500">
                      {newMessage.length}/280 characters
                    </span>
                    <button
                      onClick={postMessage}
                      disabled={isLoading || !newMessage.trim()}
                      className="bg-green-500 text-white px-6 py-2 rounded hover:bg-green-600 disabled:opacity-50"
                    >
                      {isLoading ? 'Posting...' : 'Post Message'}
                    </button>
                  </div>
                </div>

                <div className="space-y-4">
                  <h2 className="text-xl font-semibold">Messages ({messages.length})</h2>
                  
                  {messages.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">
                      No messages yet. Be the first to post!
                    </p>
                  ) : (
                    messages.map((msg, index) => (
                      <div key={index} className="p-4 bg-white border rounded-lg shadow">
                        <div className="flex justify-between items-start mb-2">
                          <span className="font-mono text-sm text-gray-600">
                            {msg.account.author.toString().slice(0, 8)}...
                          </span>
                          <span className="text-sm text-gray-500">
                            Message #{msg.account.id.toString()}
                          </span>
                        </div>
                        <p className="text-lg mb-2">{msg.account.content}</p>
                        <span className="text-xs text-gray-400">
                          {new Date(msg.account.timestamp.toNumber() * 1000).toLocaleString()}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </>
            )}
          </>
        )}
        
        {!publicKey && (
          <div className="text-center py-12">
            <p className="text-xl text-gray-600">
              Connect your wallet to use the message system
            </p>
          </div>
        )}

        <footer className="mt-12 pt-8 border-t text-center text-gray-500">
          <p>Program ID: {PROGRAM_ID.toString()}</p>
          <p>Network: Devnet</p>
        </footer>
      </div>
    </main>
  )
}