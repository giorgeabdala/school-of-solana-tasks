# Plano de Implementação - Sistema de Mensagens Solana

## 📋 Visão Geral
**Projeto:** Sistema simples de mensagens públicas na blockchain Solana
**Tempo Estimado:** 2-3 horas
**Deadline:** Hoje, 23:59 UTC

## 🎯 Funcionalidades Core
- Usuários podem postar mensagens públicas
- Visualizar todas as mensagens postadas
- Contador global de mensagens
- Limite de caracteres (280 chars como Twitter)

## 🏗️ Arquitetura do Programa

### Instruções
1. **`initialize`**
   - Cria conta global para armazenar contador
   - Seeds: `[b"global"]`
   - Apenas executado uma vez

2. **`post_message`**
   - Cria nova mensagem para o usuário
   - Seeds: `[b"message", user.key().as_ref(), counter.to_le_bytes().as_ref()]`
   - Incrementa contador global

### Estruturas de Dados
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

### PDAs Utilizados
- **Global State PDA**: `[b"global"]` - Para contador global
- **Message PDA**: `[b"message", user.key(), message_id.to_le_bytes()]` - Para cada mensagem

## 📝 Implementação Step-by-Step

### Fase 1: Setup do Projeto Anchor (30 min)
- [ ] `anchor init message_system`
- [ ] Configurar Anchor.toml para devnet
- [ ] Setup básico do programa

### Fase 2: Implementar Programa Solana (60 min)
- [ ] Definir structs (GlobalState, Message)
- [ ] Implementar instrução `initialize`
- [ ] Implementar instrução `post_message`
- [ ] Validações (limite de caracteres, autorização)

### Fase 3: Testes TypeScript (45 min)
#### Testes Happy Path:
- [ ] Inicializar programa
- [ ] Postar primeira mensagem
- [ ] Postar múltiplas mensagens
- [ ] Verificar contador incrementa

#### Testes Unhappy Path:
- [ ] Mensagem muito longa (>280 chars)
- [ ] Tentar inicializar duas vezes
- [ ] Mensagem vazia

### Fase 4: Deploy (15 min)
- [ ] Deploy para Devnet
- [ ] Anotar Program ID
- [ ] Testar no explorer

### Fase 5: Frontend (60 min)
- [ ] Setup Next.js com create-solana-dapp
- [ ] Conectar wallet (Phantom)
- [ ] Formulário para postar mensagem
- [ ] Lista de mensagens
- [ ] Estilização básica

### Fase 6: Deploy Frontend (15 min)
- [ ] Deploy no Vercel
- [ ] Testar funcionamento completo

### Fase 7: Documentação (15 min)
- [ ] Preencher PROJECT_DESCRIPTION.md
- [ ] Adicionar links e Program ID
- [ ] Documentar instruções de uso

## 🧪 Estratégia de Testes

### Cenários de Sucesso
1. **Inicialização bem-sucedida**
2. **Posting de mensagem válida**
3. **Múltiplas mensagens do mesmo usuário**
4. **Contador incrementa corretamente**

### Cenários de Erro
1. **Mensagem excede 280 caracteres**
2. **String vazia**
3. **Reinicialização do programa**
4. **Accounts incorretas**

## 📂 Estrutura de Arquivos

```
anchor_project/
├── programs/
│   └── message-system/
│       └── src/
│           └── lib.rs
├── tests/
│   └── message-system.ts
├── Anchor.toml
└── package.json

frontend/
├── components/
│   ├── MessageForm.tsx
│   └── MessageList.tsx
├── pages/
│   └── index.tsx
├── utils/
│   └── anchor.ts
└── package.json
```

## 🚀 Deploy Strategy

### Programa Solana
- **Network:** Devnet
- **RPC:** https://api.devnet.solana.com
- **Command:** `anchor deploy`

### Frontend
- **Platform:** Vercel
- **Framework:** Next.js
- **Integration:** @solana/web3.js + @coral-xyz/anchor

## ⚠️ Pontos Críticos

### Validações Essenciais
- Limite de caracteres (280)
- Validação de PDAs
- Autorização correta
- Overflow protection

### Performance
- Paginação se muitas mensagens
- Cache de estado global
- Otimização de queries

## 📊 Critérios de Sucesso
- [ ] Programa deployado na Devnet
- [ ] PDAs implementados corretamente
- [ ] Testes passando (happy + unhappy)
- [ ] Frontend funcional deployado
- [ ] PROJECT_DESCRIPTION.md completo
- [ ] Demonstração de uso documentada

## 🕐 Timeline Crítico
- **13:00-13:30:** Setup + Anchor init
- **13:30-14:30:** Implementação do programa
- **14:30-15:15:** Testes TypeScript
- **15:15-15:30:** Deploy programa
- **15:30-16:30:** Frontend development
- **16:30-16:45:** Deploy frontend  
- **16:45-17:00:** Documentação final

**Buffer Time:** 17:00-23:59 para ajustes e correções

## 🔧 Comandos Essenciais

```bash
# Setup
anchor init message_system
cd anchor_project

# Development
anchor build
anchor test
anchor deploy

# Frontend
cd ../frontend
npm create solana-dapp@latest
npm run dev
npm run build

# Deploy frontend
vercel --prod
```

## 🎯 Próximos Passos
1. Executar Fase 1 (Setup)
2. Solicitar confirmação antes de prosseguir
3. Implementação sequencial das fases
4. Validação contínua dos requisitos