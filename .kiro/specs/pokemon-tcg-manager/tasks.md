# Implementation Plan: Pokemon TCG Manager

## Overview

Aplicação desktop Electron + React + TypeScript + Vite com SQLite (better-sqlite3), Puppeteer para webscraping, Zustand + React Query para estado, e Tailwind CSS com tema Pokédex. A implementação segue uma ordem incremental: infraestrutura → banco de dados → IPC → telas → scraper → testes de propriedade.

## Tasks

- [x] 1. Configurar estrutura do projeto Electron + React + TypeScript + Vite
  - Inicializar projeto com Vite (template react-ts) e configurar Electron com electron-builder
  - Instalar dependências: better-sqlite3, puppeteer, axios, zustand, @tanstack/react-query, fast-check, vitest, tailwindcss, uuid
  - Configurar `vite.config.ts` com plugin electron, separando processos main e renderer
  - Configurar `tailwind.config.ts` com os tokens do tema Pokédex (cores, fontes Share Tech Mono e Inter)
  - Configurar `tsconfig.json` para suportar paths de main e renderer
  - _Requirements: todos_

- [x] 2. Implementar camada de banco de dados (SQLite)
  - [x] 2.1 Criar módulo de inicialização do banco (`src/main/db/database.ts`)
    - Abrir conexão SQLite com better-sqlite3
    - Executar migrations criando todas as tabelas do esquema: `collections`, `cards`, `purchases`, `product_units`, `user_collection_entries`, `decks`, `deck_cards`, `trades`, `trade_cards`, `sync_log`
    - _Requirements: 2.5, 3.3, 9.1_

  - [x] 2.2 Implementar repositórios tipados
    - `CollectionRepo`: `upsert`, `findAll`, `findById`
    - `CardRepo`: `upsert`, `findById`, `findByFilter({ collectionId, search })`
    - `PurchaseRepo`: `create`, `findAll` (ordenado por data desc), `findById`
    - `ProductUnitRepo`: `create`, `findByPurchaseId`, `findPending`, `updateStatus`
    - `UserCollectionRepo`: `addOrIncrement`, `findSummary`, `findByCollection`, `updatePrice`
    - `DeckRepo`: `create`, `findAll`, `findById`, `update`, `delete`
    - `TradeRepo`: `create`, `findAll`, `findById`
    - `SyncLogRepo`: `createEntry`, `updateEntry`, `getLastRunning`, `getLastCompleted`
    - _Requirements: 1.1–1.8, 2.1–2.9, 3.1–3.10, 4.1–4.7, 5.1–5.10, 6.1–6.10, 7.1–7.7, 9.1–9.9_

  - [x] 2.3 Escrever testes unitários dos repositórios com banco in-memory
    - Testar `PurchaseRepo.create` e `findAll` com ordenação
    - Testar `UserCollectionRepo.addOrIncrement` com duplicatas
    - Testar `DeckRepo` com validações de limite
    - _Requirements: 2.1, 2.7, 3.3, 6.4, 6.6_

  - [x] 2.4 Escrever property test: Round-trip de Purchase (Property 5)
    - `// Feature: pokemon-tcg-manager, Property 5: Round-trip de criação de Purchase`
    - Para qualquer Purchase válida, `createPurchase` seguido de `getPurchaseById` deve retornar os mesmos valores
    - **Validates: Requirements 2.1**

  - [x] 2.5 Escrever property test: N Product_Units criados por Purchase (Property 6)
    - `// Feature: pokemon-tcg-manager, Property 6: Criação de N Product_Units ao registrar Purchase`
    - Para qualquer quantidade N > 0, exatamente N units são criados com status Pending e IDs distintos
    - **Validates: Requirements 2.4**

  - [x] 2.6 Escrever property test: Histórico de Purchases ordenado (Property 7)
    - `// Feature: pokemon-tcg-manager, Property 7: Histórico de Purchases ordenado por data decrescente`
    - Para qualquer conjunto de purchases com datas aleatórias, `getPurchases()` retorna lista com `purchases[i].purchasedAt >= purchases[i+1].purchasedAt`
    - **Validates: Requirements 2.7**

  - [x] 2.7 Escrever property test: Adição de carta incrementa quantidade (Property 8)
    - `// Feature: pokemon-tcg-manager, Property 8: Adição de carta à User_Collection incrementa quantidade`
    - Para qualquer carta adicionada, `quantity` é incrementada e `productUnitId` + `registeredAt` estão presentes
    - **Validates: Requirements 3.3**

- [x] 3. Implementar IPC Bridge e handlers do processo main
  - [x] 3.1 Configurar `contextBridge` e `preload.ts`
    - Expor a interface `ElectronAPI` completa via `contextBridge.exposeInMainWorld`
    - Tipar todos os canais IPC conforme a interface definida no design
    - _Requirements: todos_

  - [x] 3.2 Implementar handlers IPC para Collections e Cards
    - `getCollections`, `getCards`, `getCardById`
    - _Requirements: 4.1, 4.5, 4.6, 8.1, 8.2_

  - [x] 3.3 Implementar handlers IPC para Purchases e Product Units
    - `createPurchase` (cria purchase + N product_units), `getPurchases`, `getPurchaseById`
    - `getProductUnit`, `updateProductUnitStatus`
    - Validar que a Collection existe no Local_Database antes de criar a Purchase
    - _Requirements: 2.1–2.9, 3.2, 3.9_

  - [x] 3.4 Implementar handlers IPC para User Collection
    - `getUserCollectionSummary` (JOIN com cards e collections, calcula distinctCardCount e totalValue)
    - `getUserCollectionCards`, `addCardToCollection`
    - _Requirements: 1.1–1.4, 3.3–3.5_

  - [x] 3.5 Implementar handlers IPC para Decks
    - `createDeck`, `getDecks`, `getDeckById`, `updateDeck`, `deleteDeck`
    - Validar limite de 60 cartas e 4 cópias por carta no handler
    - _Requirements: 6.1–6.10_

  - [x] 3.6 Implementar handlers IPC para Trades
    - `createTrade` (remove cartas cedidas, adiciona cartas recebidas, busca dados na API se necessário)
    - `getTrades`, `getTradeById`
    - _Requirements: 7.1–7.7_

  - [x] 3.7 Escrever property test: Collection Summary (Property 1)
    - `// Feature: pokemon-tcg-manager, Property 1: Collection Summary retorna exatamente as coleções com cartas`
    - Para qualquer conjunto de entries, retorna apenas coleções com ao menos uma entrada, com campos completos
    - **Validates: Requirements 1.1, 1.4**

  - [x] 3.8 Escrever property test: Contagem de cartas distintas (Property 2)
    - `// Feature: pokemon-tcg-manager, Property 2: Contagem de cartas distintas por coleção`
    - `distinctCardCount` é igual ao número de `card_id` únicos, não ao total de entradas
    - **Validates: Requirements 1.2**

  - [x] 3.9 Escrever property test: Cálculo de valor total (Property 3)
    - `// Feature: pokemon-tcg-manager, Property 3: Cálculo de valor total da coleção`
    - `totalValue` é igual à soma dos `last_price` de todas as entradas da coleção
    - **Validates: Requirements 1.3**

  - [x] 3.10 Escrever property test: Filtragem de Product_Units pendentes (Property 4)
    - `// Feature: pokemon-tcg-manager, Property 4: Filtragem de Product_Units pendentes`
    - Retorna exatamente units com status Pending ou In_Progress, com campos obrigatórios presentes
    - **Validates: Requirements 1.6, 1.7**

  - [x] 3.11 Escrever property test: Card_Library sem filtros (Property 9)
    - `// Feature: pokemon-tcg-manager, Property 9: Card_Library retorna todas as cartas da User_Collection`
    - `getCards({})` retorna todas as entradas inseridas sem omissões
    - **Validates: Requirements 4.1**

  - [x] 3.12 Escrever property test: Filtro por Collection (Property 10)
    - `// Feature: pokemon-tcg-manager, Property 10: Filtro por Collection retorna apenas cartas da coleção`
    - `getCards({ collectionId })` retorna apenas cartas com `collectionId` igual ao filtro
    - **Validates: Requirements 4.5**

  - [x] 3.13 Escrever property test: Busca por nome ou número (Property 11)
    - `// Feature: pokemon-tcg-manager, Property 11: Busca por nome ou número retorna apenas cartas correspondentes`
    - `getCards({ search: query })` retorna apenas cartas cujo `name` ou `number` contém a query (case-insensitive)
    - **Validates: Requirements 4.6**

  - [x] 3.14 Escrever property test: Deck nunca ultrapassa 60 cartas (Property 14)
    - `// Feature: pokemon-tcg-manager, Property 14: Deck nunca ultrapassa 60 cartas`
    - Para qualquer sequência de adições, `sum(quantity)` nunca excede 60
    - **Validates: Requirements 6.4**

  - [x] 3.15 Escrever property test: Deck nunca contém mais de 4 cópias (Property 15)
    - `// Feature: pokemon-tcg-manager, Property 15: Deck nunca contém mais de 4 cópias da mesma carta`
    - Para qualquer sequência de adições da mesma carta, quantidade nunca excede 4
    - **Validates: Requirements 6.6**

  - [x] 3.16 Escrever property test: Trade atualiza User_Collection (Property 16)
    - `// Feature: pokemon-tcg-manager, Property 16: Trade atualiza User_Collection de forma consistente`
    - Cartas cedidas têm quantidade reduzida; cartas recebidas têm quantidade incrementada
    - **Validates: Requirements 7.3**

- [x] 4. Checkpoint — Garantir que todos os testes passam
  - Garantir que todos os testes passam, perguntar ao usuário se houver dúvidas.

- [x] 5. Implementar PokemonTCG API Client e Initial_Import / Sync
  - [x] 5.1 Criar `PokemonTCGClient` com Axios
    - Wrapper com paginação automática para `GET /v2/sets` e `GET /v2/cards`
    - Retry automático em falhas de rede (2 tentativas)
    - _Requirements: 8.1–8.4, 9.2, 9.3_

  - [x] 5.2 Implementar `InitialImporter` com suporte a retomada
    - Verificar `sync_log` por import interrompido e retomar do `last_collection_index`
    - Upsert de collections e cards a cada página processada
    - Emitir evento IPC `onImportProgress` com `{ current, total, collectionName }`
    - Atualizar `sync_log` com status e `finished_at` ao concluir
    - _Requirements: 9.1–9.9_

  - [x] 5.3 Implementar handlers IPC `startInitialImport`, `startSync`, `getSyncStatus`, `onImportProgress`
    - `startInitialImport`: verificar se banco está vazio, iniciar importer
    - `startSync`: iniciar importer para coleções novas
    - `getSyncStatus`: retornar data do último sync e flag `isRunning`
    - _Requirements: 9.1, 9.6, 9.7, 9.8_

  - [x] 5.4 Escrever property test: Initial_Import persiste todas as coleções e cartas (Property 17)
    - `// Feature: pokemon-tcg-manager, Property 17: Initial_Import persiste todas as coleções e cartas da API`
    - Para resposta mockada com N coleções e M_i cartas, banco contém exatamente N coleções e soma de M_i cards
    - **Validates: Requirements 9.2, 9.3**

  - [x] 5.5 Escrever property test: Retomada de import parcial (Property 18)
    - `// Feature: pokemon-tcg-manager, Property 18: Retomada de import parcial começa do ponto correto`
    - Import que falha após K coleções registra `last_collection_index = K`; retomada reimporta apenas índices K+1 em diante
    - **Validates: Requirements 9.9**

- [x] 6. Implementar Price Scraper com Puppeteer
  - [x] 6.1 Criar módulo `PriceScraper` (`src/main/scraper/priceScraper.ts`)
    - Construir URL no formato `https://www.ligapokemon.com.br/?view=cards/search&card=edid={edid}%20ed={tag}`
    - Manter `liga-collection-map.json` com mapeamento de `collectionId` para `edid` e `tag`
    - Clicar em visualização em lista, aguardar `.card-list-item`
    - Extrair `cardNumber`, `minPrice` (menor preço) e `buyLink` por carta
    - Timeout de 30s, retry 2x em falha de rede
    - _Requirements: 5.2–5.6, 5.8_

  - [x] 6.2 Implementar handler IPC `scrapeCollectionPrices`
    - Chamar `PriceScraper`, atualizar `user_collection_entries` apenas para cartas na User_Collection
    - Retornar `ScrapeResult { updated: N, errors: [] }`
    - Atualizar `price_updated_at` ao concluir
    - _Requirements: 5.6, 5.7, 5.9_

  - [x] 6.3 Escrever property test: Scraper extrai menor preço (Property 12)
    - `// Feature: pokemon-tcg-manager, Property 12: Price Scraper extrai o menor preço disponível por carta`
    - Para HTML mockado com múltiplos preços por carta, função retorna o menor valor numérico
    - **Validates: Requirements 5.4**

  - [x] 6.4 Escrever property test: Atualização respeita escopo da User_Collection (Property 13)
    - `// Feature: pokemon-tcg-manager, Property 13: Atualização de preços respeita escopo da User_Collection`
    - Apenas cartas já na User_Collection têm `last_price` e `buy_link` atualizados
    - **Validates: Requirements 5.6, 5.7**

- [x] 7. Implementar hooks React Query e Zustand store
  - [x] 7.1 Criar `uiStore.ts` com Zustand
    - Estado: `viewMode` (grid/list), `sidebarOpen`, `theme`
    - _Requirements: 4.2_

  - [x] 7.2 Implementar hooks de dados com React Query
    - `useCollections`, `useUserCollection`, `useUserCollectionSummary`
    - `usePurchases`, `usePurchaseDetail`
    - `usePendingUnits`
    - `useDecks`, `useDeckDetail`
    - `useTrades`, `useTradeDetail`
    - `usePriceScraper` (mutation com estado de loading/error)
    - `useImportStatus` (polling de `getSyncStatus` + listener de `onImportProgress`)
    - _Requirements: 1.1–1.8, 2.7, 2.8, 4.1–4.7, 5.9, 9.4, 9.7_

- [x] 8. Implementar layout base e componentes UI
  - [x] 8.1 Criar `PokedexShell.tsx` com layout de dois painéis
    - Header vermelho com `PokedexEye` e título "POKÉDEX TCG"
    - `LeftPanel` com navegação (Dashboard, Compras, Biblioteca, Decks, Trocas, Config)
    - `RightPanel` como área de conteúdo com `<Outlet />` do React Router
    - _Requirements: 1.1_

  - [x] 8.2 Criar componentes UI base
    - `PokeButton.tsx`: botão arredondado estilo joystick
    - `StatusBadge.tsx`: badge colorido por `OpeningStatus` (amarelo/azul/verde)
    - `ProgressBar.tsx`: barra de progresso para import
    - `CardGrid.tsx`: grid de cartas com animação scan
    - `CardListItem.tsx`: item de lista com nome, número, coleção, qtd, preço e link
    - _Requirements: 1.6, 3.7, 4.2, 4.3, 4.4, 9.4_

  - [x] 8.3 Configurar React Router com todas as rotas definidas no design
    - `/`, `/purchases`, `/purchases/new`, `/purchases/:id`
    - `/opening/:unitId`, `/library`, `/decks`, `/decks/new`, `/decks/:id`
    - `/trades`, `/trades/new`, `/settings`
    - _Requirements: 1.8, 2.6, 3.8_

- [x] 9. Implementar telas principais
  - [x] 9.1 Implementar `Dashboard.tsx`
    - Grid de `CollectionCard` com nome, qtd cartas distintas, valor total e botão de atualizar preço
    - Lista de `PendingUnitItem` com ID, tipo, coleção e data da compra
    - Estado vazio: mensagem "NENHUMA COLEÇÃO ENCONTRADA" estilo terminal
    - Navegação para `/opening/:unitId` ao clicar em item pendente
    - _Requirements: 1.1–1.8_

  - [x] 9.2 Implementar `PurchaseForm.tsx`
    - Formulário em dois passos: dados da compra → confirmação
    - Select de tipo de produto com opção "Outro (texto livre)"
    - Autocomplete de Collection buscando no Local_Database
    - Exibir erro se Collection não encontrada
    - Redirecionar para `/opening/:firstUnitId` após salvar
    - _Requirements: 2.1–2.9_

  - [x] 9.3 Implementar tela de histórico de compras (`/purchases`)
    - Lista de purchases ordenada por data decrescente
    - Ao selecionar, exibir detalhe com tipo, coleção, qtd, valor unitário, valor total e lista de Product_Units com status
    - _Requirements: 2.7, 2.8_

  - [x] 9.4 Implementar `ProductUnitOpening.tsx`
    - Atualizar status para `In_Progress` ao entrar na tela
    - Busca de carta por nome ou número (autocomplete contra Local_Database)
    - Lista de cartas já registradas nesta sessão
    - Animação de "scan" ao adicionar carta
    - Botões "Pausar" (→ `In_Progress`) e "Concluir" (→ `Completed`)
    - Exibir erro se carta não encontrada na API
    - _Requirements: 3.1–3.10_

  - [x] 9.5 Implementar `CardLibrary.tsx`
    - Toggle grid/lista no header (persistido no `uiStore`)
    - Filtro por Collection (dropdown) e busca por nome/número (input)
    - Grid: imagens das cartas com badge de quantidade; imagem padrão se ausente
    - Lista: tabela com nome, número, coleção, qtd, preço e link LigaPokemon
    - _Requirements: 4.1–4.7, 5.10_

  - [x] 9.6 Implementar `DeckBuilder.tsx`
    - Painel esquerdo: busca de cartas da User_Collection
    - Painel direito: cartas no deck com contador (X/60)
    - Validação em tempo real: bloquear adição se > 60 cartas ou > 4 cópias, exibir toast
    - Suporte a renomear e excluir deck
    - _Requirements: 6.1–6.10_

  - [x] 9.7 Implementar `TradeForm.tsx`
    - Duas colunas: "Cartas cedidas" (da User_Collection) e "Cartas recebidas" (busca manual)
    - Confirmação com resumo antes de persistir
    - Permitir registro mesmo se carta recebida não for encontrada na API (sem imagem)
    - _Requirements: 7.1–7.7_

  - [x] 9.8 Implementar `Settings.tsx`
    - Exibir data do último sync, total de coleções e cartas importadas
    - Botão "Sincronizar agora"
    - Barra de progresso em tempo real via `useImportStatus`
    - Exibir mensagem de erro se API indisponível
    - _Requirements: 8.4, 9.1, 9.4, 9.5, 9.6, 9.7, 9.8, 9.9_

- [x] 10. Implementar splash screen de Initial_Import
  - Detectar banco vazio na inicialização do app e exibir tela de boas-vindas com progresso
  - Mostrar "Importando coleção X de Y: [nome da coleção]" em tempo real
  - Permitir uso das funcionalidades com dados parciais já importados
  - _Requirements: 9.1, 9.4, 9.5_

- [x] 11. Checkpoint final — Garantir que todos os testes passam
  - Garantir que todos os testes passam, perguntar ao usuário se houver dúvidas.

---

## Bugfix: Mapeamento de Colecoes no Scraper de Precos

- [ ] 12. Escrever property test de exploracao do bug (Bug Condition)
  - **Property 1: Bug Condition** - Mensagem de erro contem "sv1-sv8" para colecoes nao mapeadas
  - **IMPORTANTE**: Escrever este teste ANTES de implementar o fix
  - **OBJETIVO**: Confirmar que o bug existe - o teste deve FALHAR no codigo original
  - **Abordagem PBT Scoped**: Escopo deterministico - testar `collectionId = "me2pt5"` e outros IDs ausentes do mapa
  - Verificar que `buildLigaUrl("me2pt5")` retorna `null` (confirma mapa incompleto)
  - Verificar que o handler com `"me2pt5"` retorna `errors[0]` contendo `"sv1"` (confirma mensagem desatualizada)
  - Verificar que `buildLigaUrl("swsh1")` e `buildLigaUrl("xy1")` tambem retornam `null`
  - Rodar no codigo NAO fixado -- **RESULTADO ESPERADO: FALHA** (confirma que o bug existe)
  - Documentar os contraexemplos encontrados (ex: `buildLigaUrl("me2pt5")` retorna `null` em vez de URL valida)
  - Marcar tarefa como concluida quando o teste estiver escrito, rodado e a falha documentada
  - _Requirements: 1.1, 1.2_

- [ ] 13. Escrever property tests de preservation (ANTES do fix)
  - **Property 2: Preservation** - Colecoes sv1-sv9 produzem URLs identicas
  - **IMPORTANTE**: Seguir metodologia observation-first
  - Observar: `buildLigaUrl("sv1")` retorna `https://www.ligapokemon.com.br/?view=cards/search&card=edid=763%20ed=ASCTR` no codigo original
  - Observar: `buildLigaUrl("sv9")` retorna URL com `edid=754` e `tag=ASC` no codigo original
  - Observar: variantes `sv3pt5`, `sv4pt5`, `sv8pt5` retornam URLs validas no codigo original
  - Escrever property test com fast-check: para qualquer `collectionId` do conjunto `{sv1..sv9, sv3pt5, sv4pt5, sv8pt5}`, `buildLigaUrl` retorna string comecando com `https://www.ligapokemon.com.br/`
  - Escrever property test: para qualquer `collectionId` mapeado, a URL contem `edid=` e `ed=`
  - Rodar no codigo NAO fixado -- **RESULTADO ESPERADO: PASSA** (confirma baseline a preservar)
  - Marcar tarefa como concluida quando os testes estiverem escritos, rodados e passando no codigo original
  - _Requirements: 3.1, 3.2_

- [ ] 14. Fix: mapeamento de colecoes e mensagem de erro dinamica

  - [ ] 14.1 Adicionar `me2pt5` (e outras series relevantes) ao `ligaCollectionMap.json`
    - Inspecionar URLs do LigaPokemon para obter os valores reais de `edid` e `tag` de `me2pt5`
    - Adicionar entrada `"me2pt5": { "edid": "XXX", "tag": "MEWRET" }` com valores verificados
    - Considerar adicionar outras series relevantes (ex: series Sword & Shield, XY) conforme disponibilidade no LigaPokemon
    - _Bug_Condition: isBugCondition(X) onde X.collectionId NOT IN keys(ligaCollectionMap)_
    - _Expected_Behavior: buildLigaUrl("me2pt5") retorna URL valida apos adicao ao mapa_
    - _Requirements: 2.2, 2.3_

  - [ ] 14.2 Exportar `getSupportedCollections()` em `src/main/scraper/index.ts`
    - Adicionar funcao `export function getSupportedCollections(): string[] { return Object.keys(collectionMap) }`
    - Garantir que a funcao reflete dinamicamente as chaves do mapa carregado em runtime
    - _Requirements: 2.1, 2.2_

  - [ ] 14.3 Corrigir mensagem de erro em `scrapeHandler.ts` para ser dinamica
    - Importar `getSupportedCollections` de `'../scraper'`
    - Substituir a string hardcoded por mensagem derivada de `getSupportedCollections().join(', ')`
    - Mensagem final: `Colecao "${collectionId}" nao esta mapeada no LigaPokemon. Colecoes suportadas: ${supported}.`
    - _Bug_Condition: isBugCondition(X) onde X.collectionId NOT IN keys(ligaCollectionMap)_
    - _Expected_Behavior: errors[0] NAO contem "sv1-sv8" e reflete o mapa atual_
    - _Preservation: logica de scraping, retry, atualizacao de precos e retorno para colecoes mapeadas inalterados_
    - _Requirements: 2.1, 3.1, 3.2, 3.3, 3.4_

  - [ ] 14.4 Verificar que o property test de Bug Condition agora passa
    - **Property 1: Expected Behavior** - Mensagem de erro precisa para colecoes nao mapeadas
    - **IMPORTANTE**: Re-rodar o MESMO teste da tarefa 12 -- NAO escrever novo teste
    - O teste da tarefa 12 codifica o comportamento esperado
    - Quando este teste passar, confirma que o bug foi corrigido
    - **RESULTADO ESPERADO: PASSA** (confirma que o fix funciona)
    - _Requirements: 2.1, 2.2_

  - [ ] 14.5 Verificar que os property tests de preservation ainda passam
    - **Property 2: Preservation** - Colecoes sv1-sv9 continuam produzindo URLs identicas
    - **IMPORTANTE**: Re-rodar os MESMOS testes da tarefa 13 -- NAO escrever novos testes
    - **RESULTADO ESPERADO: PASSA** (confirma ausencia de regressoes)
    - Confirmar que `buildLigaUrl` para todos os 12 collectionIds originais retorna as mesmas URLs de antes

- [ ] 15. Checkpoint -- Garantir que todos os testes do bugfix passam
  - Garantir que todos os testes passam, perguntar ao usuario se houver duvidas.

## Notes

- Tarefas marcadas com `*` são opcionais e podem ser puladas para um MVP mais rápido
- Cada tarefa referencia os requisitos específicos para rastreabilidade
- Os checkpoints garantem validação incremental
- Os testes de propriedade validam invariantes universais com fast-check (mínimo 100 iterações cada)
- Os testes unitários validam exemplos específicos e casos de borda
