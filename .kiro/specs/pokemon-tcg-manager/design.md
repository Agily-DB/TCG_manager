# Pokemon TCG Manager — Bugfix Design: Mapeamento de Coleções no Scraper de Preços

## Overview

O scraper de preços falha para qualquer coleção fora da série Scarlet & Violet porque `ligaCollectionMap.json` só contém sv1–sv9. Além disso, a mensagem de erro em `scrapeHandler.ts` está hardcoded com "sv1–sv8", tornando-a factualmente incorreta mesmo para o estado atual do mapa.

O fix é composto por duas mudanças independentes e cirúrgicas:
1. Adicionar entradas faltantes ao `ligaCollectionMap.json` (ex: `me2pt5` e outras séries relevantes do LigaPokemon)
2. Tornar a mensagem de erro dinâmica, derivando a lista de séries suportadas diretamente das chaves do mapa carregado em runtime

Nenhuma lógica de scraping, retry, ou atualização de preços é alterada.

## Glossary

- **Bug_Condition (C)**: Condição que dispara o bug — `collectionId` ausente de `ligaCollectionMap.json`
- **Property (P)**: Comportamento desejado quando C(X) é verdadeiro — mensagem de erro precisa, sem strings desatualizadas
- **Preservation**: Comportamento existente para sv1–sv9 que não deve ser alterado pelo fix
- **buildLigaUrl**: Função em `src/main/scraper/index.ts` que converte `collectionId` em URL do LigaPokemon usando o mapa JSON
- **ligaCollectionMap.json**: Arquivo estático em `src/main/scraper/` que mapeia `collectionId` → `{ edid, tag }`
- **scrapeHandler.ts**: Handler IPC em `src/main/ipc/` que orquestra a chamada ao scraper e retorna `ScrapeResult`
- **collectionId**: Identificador da coleção no formato da PokemonTCG API (ex: `sv1`, `me2pt5`)

## Bug Details

### Bug Condition

O bug se manifesta quando `scrapeHandler.ts` recebe um `collectionId` que não existe como chave em `ligaCollectionMap.json`. A função `buildLigaUrl` retorna `null`, e o handler retorna uma mensagem de erro com a string hardcoded `"sv1–sv8"` — desatualizada em relação ao mapa real (que já inclui sv9 e sv8pt5).

**Formal Specification:**
```
FUNCTION isBugCondition(X)
  INPUT: X of type ScrapeRequest { collectionId: string }
  OUTPUT: boolean

  RETURN X.collectionId NOT IN keys(ligaCollectionMap)
END FUNCTION
```

### Examples

- `collectionId = "me2pt5"` → `buildLigaUrl` retorna `null` → erro com "sv1–sv8" (incorreto, pois sv9 existe)
- `collectionId = "swsh1"` → mesmo comportamento, mensagem desatualizada
- `collectionId = "sv9"` → `buildLigaUrl` retorna URL válida → scraping prossegue normalmente (não é bug)
- `collectionId = "sv1"` → comportamento correto preservado após o fix

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- `buildLigaUrl("sv1")` até `buildLigaUrl("sv9")` devem retornar exatamente as mesmas URLs de antes
- A lógica de scraping com Puppeteer (retry, timeout, extração de preços) não é tocada
- A atualização de `last_price` e `buy_link` apenas para cartas na `user_collection` permanece inalterada
- O retorno `{ updated: 0, errors: ['Nenhum preço encontrado...'] }` para páginas vazias permanece inalterado

**Scope:**
Todos os inputs onde `isBugCondition(X)` é falso (collectionId presente no mapa) devem ser completamente não afetados. Isso inclui todos os 12 collectionIds atualmente mapeados (sv1–sv9, sv3pt5, sv4pt5, sv8pt5).

## Hypothesized Root Cause

1. **Mapa incompleto**: `ligaCollectionMap.json` foi criado cobrindo apenas a série Scarlet & Violet. Séries anteriores (ex: Mewtwo Returns `me2pt5`, Sword & Shield, etc.) nunca foram adicionadas.

2. **Mensagem hardcoded desatualizada**: A string `"sv1–sv8"` em `scrapeHandler.ts` foi escrita manualmente e não acompanhou a adição de sv9 e sv8pt5 ao mapa. Não há mecanismo para derivar automaticamente a lista de séries suportadas.

3. **Ausência de fallback dinâmico**: `buildLigaUrl` retorna `null` sem expor quais chaves estão disponíveis, forçando o handler a hardcodar a lista de séries na mensagem de erro.

## Correctness Properties

Property 1: Bug Condition — Mensagem de erro não contém strings desatualizadas

_For any_ `collectionId` onde `isBugCondition` retorna `true` (collectionId ausente do mapa), o handler fixado SHALL retornar `{ updated: 0, errors: [msg] }` onde `msg` NÃO contém a substring `"sv1–sv8"` e NÃO contém informação factualmente incorreta sobre as séries suportadas.

**Validates: Requirements 2.1**

Property 2: Preservation — Coleções mapeadas produzem o mesmo resultado

_For any_ `collectionId` onde `isBugCondition` retorna `false` (collectionId presente no mapa), `buildLigaUrl` fixado SHALL retornar exatamente a mesma URL que a versão original retornaria, preservando todo o comportamento de scraping existente.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4**

## Fix Implementation

### Changes Required

**Arquivo 1**: `src/main/scraper/ligaCollectionMap.json`

**Mudança**: Adicionar entradas para séries não-SV relevantes do LigaPokemon. O mapeamento de `edid` e `tag` deve ser obtido inspecionando as URLs do LigaPokemon para cada coleção.

Entrada a adicionar (exemplo confirmado para `me2pt5`):
```json
{
  "me2pt5": { "edid": "XXX", "tag": "MEWRET" }
}
```

> Os valores reais de `edid` e `tag` devem ser verificados no LigaPokemon antes de commitar.

**Arquivo 2**: `src/main/ipc/scrapeHandler.ts`

**Mudança**: Substituir a mensagem hardcoded por uma derivada dinamicamente das chaves do mapa.

Antes:
```typescript
return {
  updated: 0,
  errors: [`Coleção "${collectionId}" não está mapeada no LigaPokemon. Apenas coleções Scarlet & Violet (sv1–sv8) são suportadas no momento.`]
}
```

Depois (opção A — lista dinâmica):
```typescript
import { buildLigaUrl, getSupportedCollections } from '../scraper'

// No handler:
const supported = getSupportedCollections().join(', ')
return {
  updated: 0,
  errors: [`Coleção "${collectionId}" não está mapeada no LigaPokemon. Coleções suportadas: ${supported}.`]
}
```

Depois (opção B — mensagem genérica, sem listar séries):
```typescript
return {
  updated: 0,
  errors: [`Coleção "${collectionId}" não está mapeada no LigaPokemon. Verifique se o ID da coleção está correto.`]
}
```

**Arquivo 3**: `src/main/scraper/index.ts` (apenas se opção A for escolhida)

**Mudança**: Exportar função auxiliar que expõe as chaves do mapa:
```typescript
export function getSupportedCollections(): string[] {
  return Object.keys(collectionMap)
}
```

### Decisão de Design

A opção A (lista dinâmica) é preferível porque:
- A mensagem de erro se mantém automaticamente atualizada conforme o JSON cresce
- Não requer manutenção manual da mensagem ao adicionar novas coleções
- Custo de implementação é mínimo (uma função de uma linha)

## Testing Strategy

### Validation Approach

Duas fases: primeiro rodar testes no código não fixado para confirmar o bug (exploratory), depois verificar que o fix corrige o comportamento e não quebra nada (fix + preservation checking).

### Exploratory Bug Condition Checking

**Goal**: Confirmar que a mensagem de erro atual contém "sv1–sv8" e que `me2pt5` não é reconhecido.

**Test Plan**: Chamar `buildLigaUrl("me2pt5")` e verificar que retorna `null`. Chamar o handler com `"me2pt5"` e verificar que a mensagem de erro contém "sv1–sv8". Rodar no código ANTES do fix para observar a falha.

**Test Cases**:
1. **Mapeamento ausente**: `buildLigaUrl("me2pt5")` retorna `null` (confirma bug no mapa)
2. **Mensagem desatualizada**: handler com `"me2pt5"` retorna erro contendo "sv1–sv8" (confirma bug na mensagem)
3. **Série anterior**: `buildLigaUrl("swsh1")` retorna `null` (confirma escopo do problema)
4. **Série fora do range**: `buildLigaUrl("xy1")` retorna `null` (edge case — série mais antiga)

**Expected Counterexamples**:
- `buildLigaUrl("me2pt5")` retorna `null` em vez de uma URL válida
- Mensagem de erro contém "sv1–sv8" mesmo com sv9 e sv8pt5 já mapeados

### Fix Checking

**Goal**: Verificar que após o fix, coleções não mapeadas recebem mensagem de erro precisa.

**Pseudocode:**
```
FOR ALL X WHERE isBugCondition(X) DO
  result := scrapeHandler_fixed(X)
  ASSERT result.updated = 0
  ASSERT result.errors[0] NÃO CONTÉM "sv1–sv8"
  ASSERT result.errors[0] CONTÉM X.collectionId
END FOR
```

### Preservation Checking

**Goal**: Verificar que todos os 12 collectionIds atualmente mapeados continuam produzindo URLs idênticas.

**Pseudocode:**
```
FOR ALL X WHERE NOT isBugCondition(X) DO
  ASSERT buildLigaUrl_original(X.collectionId) = buildLigaUrl_fixed(X.collectionId)
END FOR
```

**Testing Approach**: Property-based testing com fast-check gerando collectionIds aleatórios do conjunto mapeado, verificando que a URL retornada é idêntica antes e depois do fix.

**Test Cases**:
1. **sv1–sv9 preservados**: `buildLigaUrl("sv1")` até `buildLigaUrl("sv9")` retornam as mesmas URLs
2. **sv3pt5, sv4pt5, sv8pt5 preservados**: variantes com sufixo `pt5` continuam funcionando
3. **me2pt5 após fix**: `buildLigaUrl("me2pt5")` retorna URL válida com `edid` e `tag` corretos
4. **Mensagem sem "sv1–sv8"**: qualquer collectionId fora do mapa gera erro sem a string desatualizada

### Unit Tests

- Testar `buildLigaUrl` para cada collectionId do mapa (deve retornar URL no formato correto)
- Testar `buildLigaUrl("me2pt5")` após fix (deve retornar URL válida)
- Testar `buildLigaUrl` com collectionId inexistente (deve retornar `null`)
- Testar que a mensagem de erro do handler não contém "sv1–sv8"

### Property-Based Tests

- Para qualquer `collectionId` presente no mapa, `buildLigaUrl` retorna string começando com `https://www.ligapokemon.com.br/`
- Para qualquer `collectionId` ausente do mapa, o handler retorna `{ updated: 0 }` e `errors[0]` não contém "sv1–sv8"
- Para qualquer `collectionId` presente no mapa, o resultado de `buildLigaUrl` é idêntico antes e depois do fix (preservation)

### Integration Tests

- Fluxo completo: usuário solicita atualização de preços para `me2pt5` → URL construída corretamente → scraping executado
- Fluxo de erro: usuário solicita atualização para coleção inexistente → mensagem de erro precisa exibida na UI
- Regressão: atualização de preços para `sv1` continua funcionando após o fix
