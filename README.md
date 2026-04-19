# Pokemon TCG Manager

Aplicação desktop para gerenciamento de coleção de cartas do Pokémon TCG. Permite registrar compras, abrir pacotes, catalogar cartas, montar decks, registrar trocas e consultar preços de mercado via scraping do LigaPokemon.

---

## Contexto para IAs de Geração de Código

Este documento serve como referência completa para qualquer IA que precise entender, estender ou corrigir este projeto. Leia integralmente antes de gerar código.

---

## Stack Tecnológica

| Camada | Tecnologia |
|--------|-----------|
| Runtime | Electron 31 (processo main + renderer separados) |
| Frontend | React 18 + TypeScript + Vite (via electron-vite) |
| Estilo | Tailwind CSS com tema Pokédex customizado |
| Estado | Zustand (UI local) + TanStack React Query (dados servidor) |
| Banco de dados | SQLite via better-sqlite3 (processo main) |
| HTTP | Axios (chamadas à PokemonTCG API) |
| Scraping | Puppeteer (LigaPokemon price scraper) |
| Roteamento | React Router DOM v6 |
| Testes | Vitest + fast-check (property-based testing) |
| Build | electron-builder (output: `C:\Users\Bruno\Desktop\TCG-Build`) |

---

## Arquitetura

### Processos Electron

```
Main Process (Node.js)
├── src/main/index.ts          — entry point, inicializa DB e handlers IPC
├── src/main/db/               — SQLite: schema, migrations, repositórios
├── src/main/ipc/              — handlers IPC (bridge main ↔ renderer)
├── src/main/importer/         — PokemonTCG API client + importador inicial
└── src/main/scraper/          — Puppeteer price scraper (LigaPokemon)

Renderer Process (React)
├── src/renderer/src/App.tsx   — React Router setup
├── src/renderer/src/components/screens/  — telas da aplicação
├── src/renderer/src/components/ui/       — componentes reutilizáveis
├── src/renderer/src/hooks/               — React Query hooks
└── src/renderer/src/store/uiStore.ts     — Zustand store

Preload
└── src/preload/index.ts       — contextBridge expõe ElectronAPI ao renderer

Shared
└── src/shared/types.ts        — tipos TypeScript compartilhados entre processos
```

### Comunicação IPC

O renderer **nunca** acessa o banco diretamente. Toda comunicação passa pelo `contextBridge`:

```typescript
// Renderer chama:
window.electron.getCards({ collectionId: 'sv9' })

// Preload expõe via contextBridge:
contextBridge.exposeInMainWorld('electron', { getCards: ... })

// Main process responde via ipcMain.handle()
```

A interface completa está em `src/shared/types.ts` → `ElectronAPI`.

---

## Banco de Dados (SQLite)

**Localização em produção:** `%APPDATA%\pokemon-tcg-manager\pokemon-tcg.db`

### Schema Completo

```sql
collections (
  id TEXT PRIMARY KEY,          -- ID da PokemonTCG API (ex: "sv9", "me2pt5")
  name TEXT NOT NULL,           -- Nome da coleção
  series TEXT,                  -- Série (ex: "Scarlet & Violet")
  total INTEGER,                -- Total de cartas incluindo secretas
  release_date TEXT,
  symbol_url TEXT,
  logo_url TEXT,
  ptcgo_code TEXT,              -- Código PTCGO (ex: "ASC", "JTG") — usado para scraping
  synced_at TEXT
)

cards (
  id TEXT PRIMARY KEY,          -- ID da PokemonTCG API (ex: "sv9-290")
  collection_id TEXT REFERENCES collections(id),
  name TEXT NOT NULL,
  number TEXT NOT NULL,         -- Número impresso (ex: "290", "047")
  rarity TEXT,
  types TEXT,                   -- JSON array serializado
  image_small TEXT,
  image_large TEXT,
  UNIQUE(collection_id, number)
)

purchases (
  id TEXT PRIMARY KEY,          -- UUID
  product_type TEXT NOT NULL,   -- 'Booster' | 'ETB' | 'Booster_Box' | etc.
  collection_id TEXT REFERENCES collections(id),
  quantity INTEGER NOT NULL,    -- Número de pacotes/produtos
  unit_price REAL NOT NULL,
  purchased_at TEXT NOT NULL    -- ISO 8601
)

product_units (
  id TEXT PRIMARY KEY,          -- UUID — representa 1 pacote físico
  purchase_id TEXT REFERENCES purchases(id),
  opening_status TEXT DEFAULT 'Pending',  -- 'Pending' | 'In_Progress' | 'Completed'
  started_at TEXT,
  completed_at TEXT
)

user_collection_entries (
  id TEXT PRIMARY KEY,          -- UUID
  card_id TEXT REFERENCES cards(id),
  product_unit_id TEXT REFERENCES product_units(id),
  quantity INTEGER DEFAULT 1,
  last_price REAL,              -- Último preço scraped (BRL)
  buy_link TEXT,                -- Link direto para compra no LigaPokemon
  price_updated_at TEXT,
  registered_at TEXT NOT NULL
)

decks (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
)

deck_cards (
  deck_id TEXT REFERENCES decks(id) ON DELETE CASCADE,
  card_id TEXT REFERENCES cards(id),
  quantity INTEGER DEFAULT 1,
  PRIMARY KEY (deck_id, card_id)
)

trades (
  id TEXT PRIMARY KEY,
  traded_at TEXT NOT NULL,
  notes TEXT
)

trade_cards (
  id TEXT PRIMARY KEY,
  trade_id TEXT REFERENCES trades(id) ON DELETE CASCADE,
  card_id TEXT REFERENCES cards(id),   -- NULL se carta não está no banco
  direction TEXT NOT NULL,             -- 'given' | 'received'
  card_name TEXT,
  card_number TEXT,
  collection_name TEXT
)

sync_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL,                  -- 'initial_import'
  status TEXT NOT NULL,                -- 'running' | 'completed' | 'failed'
  last_collection_index INTEGER DEFAULT 0,
  started_at TEXT NOT NULL,
  finished_at TEXT
)
```

### Migrations

O sistema usa migrations incrementais seguras. Ao inicializar o banco, verifica via `PRAGMA table_info()` se colunas novas existem antes de fazer `ALTER TABLE`. Exemplo em `src/main/db/database.ts`.

---

## Integração com PokemonTCG API

**Base URL:** `https://api.pokemontcg.io/v2`

### Endpoints usados

| Endpoint | Uso |
|----------|-----|
| `GET /v2/sets` | Lista todas as coleções com paginação |
| `GET /v2/cards?q=set.id:{id}` | Cartas de uma coleção específica |

### Campo importante: `ptcgoCode`

Cada set retornado pela API contém `ptcgoCode` — o código usado pelo PTCGO/PTCGL para identificar a coleção. Este campo é **essencial** para o scraping de preços no LigaPokemon.

Exemplos:
- `me2pt5` (Ascended Heroes) → `ptcgoCode: "ASC"`
- `sv9` (Journey Together) → `ptcgoCode: "JTG"`
- `sv8pt5` (Prismatic Evolutions) → `ptcgoCode: "PRE"`

O `ptcgoCode` é salvo na coluna `ptcgo_code` da tabela `collections`.

---

## Price Scraper (LigaPokemon)

### Como funciona

1. Constrói URL: `https://www.ligapokemon.com.br/?view=cards%2Fsearch&tipo=1&card=ed%3D{ptcgoCode}`
2. Puppeteer carrega a página
3. Extrai o array `cardsjson` embutido no `<script>` da página — contém **todas** as cartas com preços, sem necessidade de paginação
4. Cada item do `cardsjson` tem:
   - `sN`: número da carta com zeros à esquerda (ex: `"290"`, `"047"`)
   - `nEN`: nome em inglês com sufixo de número (ex: `"Mega Dragonite ex (#290/217)"`)
   - `p1a`: menor preço disponível (ex: `"1099.90"`)
   - `sSigla`: tag da edição (ex: `"ASC"`)
5. Gera link direto para a carta: `/?view=cards/card&card=NAME(NUM/TOTAL)&ed=TAG&num=NUM`

### Geração do buy_link

```typescript
// nEN vem como "Mega Dragonite ex (#290/217)"
// Remover sufixo (#NUM/TOTAL) para obter nome limpo
const baseName = nEN.replace(/\s*\(#?\d+[A-Za-z]?\/\d+\)\s*$/, '').trim()
// Resultado: "Mega Dragonite ex"

// printedTotal extraído de .tb-cards-count na página (ex: 217)
const cardParam = `${baseName} (${sN}/${printedTotal})`
// Resultado: "Mega Dragonite ex (290/217)"

const buyLink = `https://www.ligapokemon.com.br/?view=cards/card&card=${encodeURIComponent(cardParam)}&ed=${sSigla}&num=${sN}`
// Resultado: https://www.ligapokemon.com.br/?view=cards/card&card=Mega%20Dragonite%20ex%20(290%2F217)&ed=ASC&num=290
```

### Matching de preços

O número da carta no LigaPokemon (`sN`) pode ter zeros à esquerda (`"047"`), enquanto a PokemonTCG API retorna sem zeros (`"47"`). O matching normaliza ambos os lados:

```typescript
const normalizedPriceNum = priceData.cardNumber.replace(/^0+/, '') || priceData.cardNumber
const match = entries.find((e) => {
  const normalizedEntryNum = e.card.number.replace(/^0+/, '') || e.card.number
  return normalizedEntryNum === normalizedPriceNum
})
```

---

## Fluxo de Dados Principal

### 1. Importação Inicial

```
App abre → DB vazio detectado → InitialImportSplash exibida
→ startInitialImport() IPC
→ fetchAllSets() → upsert em collections (com ptcgoCode)
→ Para cada coleção nova: fetchCardsForSet() → upsert em cards
→ onImportProgress IPC events → barra de progresso no renderer
```

### 2. Registro de Compra

```
PurchaseForm → createPurchase IPC
→ INSERT purchases + N product_units (status: Pending)
→ Redireciona para /opening/:firstUnitId
```

### 3. Abertura de Pacote

```
ProductUnitOpening → updateProductUnitStatus(In_Progress)
→ Usuário busca carta por nome/número
→ addCardToCollection IPC → INSERT/UPDATE user_collection_entries
→ Botão "Concluir" → updateProductUnitStatus(Completed)
```

### 4. Atualização de Preços

```
Dashboard → scrapeCollectionPrices(collectionId) IPC
→ collectionRepo.findById() → obtém ptcgoCode
→ Puppeteer → LigaPokemon → extrai cardsjson
→ Para cada carta na user_collection: updatePrice(cardId, price, buyLink)
→ Retorna { updated: N, errors: [] }
```

---

## Telas da Aplicação

| Rota | Componente | Descrição |
|------|-----------|-----------|
| `/` | `Dashboard` | Resumo de coleções com preços e pacotes pendentes |
| `/purchases` | `PurchaseList` | Histórico de compras |
| `/purchases/new` | `PurchaseForm` | Registrar nova compra |
| `/purchases/:id` | `PurchaseList` | Detalhe de compra |
| `/opening/:unitId` | `ProductUnitOpening` | Abertura de pacote carta a carta |
| `/library` | `CardLibrary` | Biblioteca com filtros, grid/lista, links de compra |
| `/decks` | `DeckList` | Lista de decks |
| `/decks/new` | `DeckBuilder` | Criar deck |
| `/decks/:id` | `DeckBuilder` | Editar deck (máx 60 cartas, máx 4 cópias) |
| `/trades` | `TradeList` | Histórico de trocas |
| `/trades/new` | `TradeForm` | Registrar troca |
| `/settings` | `Settings` | Sync, importação, status do banco |

---

## Tema Visual (Pokédex)

Tailwind configurado com tokens customizados:

```typescript
// tailwind.config.ts
colors: {
  'pokedex-red': '#CC0000',
  'pokedex-dark-red': '#990000',
  'pokedex-black': '#1B1C1C',
  'pokedex-panel': '#2A2A2A',
  'pokedex-yellow': '#FFD700',
  'pokedex-white': '#F5F6F7',
  'pokedex-gray': '#58595A',
  'pokedex-blue': '#0066CC',
}
fonts: {
  mono: ['Share Tech Mono', 'monospace'],
  sans: ['Inter', 'sans-serif'],
}
```

---

## Comandos

```bash
# Desenvolvimento
npm run dev

# Build para produção (Windows)
# FECHAR O APP ANTES — arquivos ficam bloqueados
npm run build
# Output: C:\Users\Bruno\Desktop\TCG-Build\win-unpacked\

# Testes
npm run test

# Testes em modo watch
npm run test:watch
```

---

## Estrutura de Arquivos Chave

```
src/
├── shared/
│   └── types.ts                    ← TODOS os tipos TypeScript do projeto
├── main/
│   ├── index.ts                    ← Entry point: initDatabase, registerHandlers
│   ├── db/
│   │   ├── database.ts             ← Schema SQL + migrations incrementais
│   │   └── repos/
│   │       ├── collectionRepo.ts   ← upsert, findAll, findById
│   │       ├── cardRepo.ts         ← upsert, findById, findByFilter
│   │       ├── purchaseRepo.ts     ← create, findAll, findById
│   │       ├── productUnitRepo.ts  ← create, findPending, updateStatus
│   │       ├── userCollectionRepo.ts ← addOrIncrement, findSummary, updatePrice
│   │       ├── deckRepo.ts         ← CRUD + validações 60 cartas / 4 cópias
│   │       ├── tradeRepo.ts        ← create, findAll, findById
│   │       └── syncLogRepo.ts      ← createEntry, updateEntry, getLastRunning
│   ├── ipc/
│   │   ├── collectionsHandler.ts   ← getCollections, getCards, getCardById
│   │   ├── purchasesHandler.ts     ← createPurchase, getPurchases, etc.
│   │   ├── userCollectionHandler.ts ← getUserCollectionSummary, addCardToCollection
│   │   ├── decksHandler.ts         ← CRUD decks
│   │   ├── tradesHandler.ts        ← createTrade, getTrades
│   │   ├── scrapeHandler.ts        ← scrapeCollectionPrices
│   │   └── syncHandler.ts          ← startInitialImport, startSync, getSyncStatus
│   ├── importer/
│   │   ├── pokemonTCGClient.ts     ← fetchAllSets, fetchCardsForSet (com retry)
│   │   └── initialImporter.ts      ← syncCollectionList, importCardsForCollections
│   └── scraper/
│       ├── priceScraper.ts         ← Puppeteer + extração cardsjson
│       └── ligaCollectionMap.json  ← Legado (não mais usado ativamente)
├── preload/
│   └── index.ts                    ← contextBridge.exposeInMainWorld('electron', ...)
└── renderer/src/
    ├── App.tsx                     ← React Router + QueryClient setup
    ├── hooks/                      ← React Query hooks (useCards, usePurchases, etc.)
    ├── store/uiStore.ts            ← Zustand: viewMode, sidebarOpen
    └── components/
        ├── layout/PokedexShell.tsx ← Layout principal com navegação
        ├── screens/                ← Uma tela por rota
        └── ui/                     ← PokeButton, StatusBadge, ProgressBar, etc.
```

---

## Padrões e Convenções

### IPC Handlers

Todos os handlers seguem o padrão:
```typescript
ipcMain.handle('channelName', async (_, ...args): Promise<ReturnType> => {
  // lógica
})
```

### Repositórios

Todos os repositórios são objetos singleton exportados, com métodos síncronos (better-sqlite3 é síncrono):
```typescript
export const collectionRepo = {
  upsert(collection: Collection): void { ... },
  findAll(): Collection[] { ... },
  findById(id: string): Collection | null { ... },
}
```

### React Query Keys

```typescript
['userCollectionSummary']   // Dashboard
['cards', filter]           // CardLibrary
['purchases']               // PurchaseList
['decks']                   // DeckList
['trades']                  // TradeList
['syncStatus']              // Settings
```

### Validações de Negócio

- **Deck**: máximo 60 cartas no total, máximo 4 cópias da mesma carta
- **Trade**: cartas cedidas são removidas da user_collection; cartas recebidas são adicionadas
- **Purchase**: valida que a `collectionId` existe no banco antes de criar

---

## Problemas Conhecidos e Soluções

### Build trava com "files locked"
O app deve estar fechado antes de buildar. O electron-builder não consegue sobrescrever o `.exe` em uso.

### Sync não popula ptcgoCode
Se o banco foi criado antes da adição do campo `ptcgo_code`, a migration automática adiciona a coluna. Após isso, rodar "Sincronizar agora" nas Configurações popula o campo para todas as coleções.

### Scraping retorna 0 preços
Verificar se o `ptcgoCode` da coleção está correto. O LigaPokemon usa tags específicas (ex: `ASC` para Ascended Heroes). O `ptcgoCode` vem da PokemonTCG API no campo `ptcgoCode` de cada set.

### Matching de preços falha
O número da carta no LigaPokemon pode ter zeros à esquerda (`"047"`). O código normaliza ambos os lados removendo zeros antes de comparar.

---

## Variáveis de Ambiente / Configuração

Não há arquivo `.env`. Configurações hardcoded:

| Config | Valor | Local |
|--------|-------|-------|
| PokemonTCG API base URL | `https://api.pokemontcg.io/v2` | `pokemonTCGClient.ts` |
| LigaPokemon base URL | `https://www.ligapokemon.com.br` | `scrapeHandler.ts` |
| DB path | `%APPDATA%/pokemon-tcg-manager/pokemon-tcg.db` | `database.ts` |
| Build output | `C:\Users\Bruno\Desktop\TCG-Build` | `package.json` |
| Scraper timeout | 30s por página | `priceScraper.ts` |
| API retry | 3 tentativas, 1s delay | `pokemonTCGClient.ts` |
| Scraper retry | 2 tentativas | `priceScraper.ts` |
