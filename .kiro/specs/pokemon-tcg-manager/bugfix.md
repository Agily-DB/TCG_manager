# Bugfix Requirements Document

## Introduction

O scraper de preços do Pokemon TCG Manager falha silenciosamente para qualquer coleção fora da série Scarlet & Violet (sv1–sv9). Quando o usuário tenta atualizar preços de uma coleção como `me2pt5` (Mewtwo Returns), o sistema retorna uma mensagem de erro com informação desatualizada, bloqueando completamente a atualização de preços para séries não mapeadas. O impacto é que coleções de outras séries (ex: Mewtwo Returns, outras promos) ficam sem suporte de atualização de preços.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN o usuário solicita atualização de preços de uma coleção cujo `collectionId` não está presente em `ligaCollectionMap.json` THEN o sistema retorna erro `"Coleção 'X' não está mapeada no LigaPokemon. Apenas coleções Scarlet & Violet (sv1–sv8) são suportadas no momento."`

1.2 WHEN a mensagem de erro é gerada para coleções não mapeadas THEN o sistema exibe "sv1–sv8" mesmo que sv9 já esteja mapeado, tornando a mensagem factualmente incorreta

1.3 WHEN `buildLigaUrl` recebe um `collectionId` ausente do mapa THEN a função retorna `null` sem qualquer mecanismo de fallback ou extensão dinâmica do mapa

### Expected Behavior (Correct)

2.1 WHEN o usuário solicita atualização de preços de uma coleção não mapeada THEN o sistema SHALL exibir uma mensagem de erro clara e atualizada indicando quais séries são suportadas, sem informação desatualizada

2.2 WHEN `ligaCollectionMap.json` é atualizado com novos mapeamentos (ex: `me2pt5`, séries anteriores) THEN o sistema SHALL reconhecer e utilizar esses mapeamentos sem necessidade de alteração de código

2.3 WHEN o usuário solicita atualização de preços de uma coleção mapeada THEN o sistema SHALL construir a URL correta e prosseguir com o scraping normalmente

### Unchanged Behavior (Regression Prevention)

3.1 WHEN o `collectionId` está presente em `ligaCollectionMap.json` (ex: sv1–sv9) THEN o sistema SHALL CONTINUE TO construir a URL correta no formato `https://www.ligapokemon.com.br/?view=cards/search&card=edid={edid}%20ed={tag}`

3.2 WHEN o scraping é executado com sucesso para uma coleção mapeada THEN o sistema SHALL CONTINUE TO atualizar `last_price` e `buy_link` apenas para cartas presentes na `user_collection`

3.3 WHEN ocorre falha de rede durante o scraping THEN o sistema SHALL CONTINUE TO realizar até 2 retentativas antes de retornar erro

3.4 WHEN nenhum preço é encontrado na página do LigaPokemon THEN o sistema SHALL CONTINUE TO retornar `{ updated: 0, errors: ['Nenhum preço encontrado...'] }`

---

## Bug Condition (Pseudocódigo)

```pascal
FUNCTION isBugCondition(X)
  INPUT: X of type ScrapeRequest { collectionId: string }
  OUTPUT: boolean

  RETURN collectionId NOT IN ligaCollectionMap
END FUNCTION
```

```pascal
// Property: Fix Checking — Mensagem de erro precisa e atualizada
FOR ALL X WHERE isBugCondition(X) DO
  result ← scrapeCollectionPrices'(X)
  ASSERT result.errors[0] NÃO CONTÉM "sv1–sv8"
  ASSERT result.updated = 0
END FOR
```

```pascal
// Property: Preservation Checking
FOR ALL X WHERE NOT isBugCondition(X) DO
  ASSERT scrapeCollectionPrices(X) = scrapeCollectionPrices'(X)
END FOR
```
