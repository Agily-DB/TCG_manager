# Requirements Document

## Introduction

Aplicação local para gerenciamento de coleção de cartas do TCG Pokémon. O sistema permite registrar compras de diferentes tipos de produtos TCG (boosters avulsos, blisters, ETBs, booster boxes, tins, decks pré-montados, bundles e outros), catalogar cartas obtidas, consultar e atualizar preços via webscraping da Liga Pokémon, criar decks com cartas da coleção pessoal, registrar trocas de cartas e visualizar o valor total do investimento por coleção.

## Glossary

- **App**: A aplicação local de gerenciamento de TCG Pokémon
- **Collection**: Um conjunto de cartas pertencente a uma expansão oficial do TCG Pokémon (ex: Scarlet & Violet, Base Set)
- **Card**: Uma carta individual do TCG Pokémon, identificada por número, nome e coleção
- **Booster**: Um pacote avulso lacrado de cartas do TCG Pokémon
- **Blister**: Produto contendo 1 a 3 Boosters e geralmente uma carta promocional
- **ETB**: Elite Trainer Box — caixa contendo aproximadamente 8 a 9 Boosters, acessórios e cartas promocionais
- **Booster_Box**: Caixa selada contendo 36 Boosters de uma mesma expansão
- **Tin**: Lata colecionável contendo Boosters e uma ou mais cartas promocionais
- **Starter_Deck**: Deck pré-montado com cartas fixas, voltado para iniciantes (também chamado de Theme Deck)
- **Bundle**: Pacote especial contendo múltiplos Boosters e itens adicionais
- **TCG_Product**: Qualquer produto oficial do TCG Pokémon disponível para compra, incluindo Booster, Blister, ETB, Booster_Box, Tin, Starter_Deck, Bundle e outros tipos reconhecidos pela Liga Pokémon
- **Purchase**: Registro de compra de um TCG_Product pelo usuário, com tipo de produto, quantidade, valor pago e data da compra
- **User_Collection**: O conjunto de cartas que o usuário possui fisicamente
- **Deck**: Um conjunto de até 60 cartas montado pelo usuário para jogar
- **Trade**: Registro de troca de cartas entre o usuário e terceiros
- **Product_Unit**: Instância individual de um TCG_Product comprado, identificada por um ID único gerado automaticamente. Ex: em uma compra de 6 Boosters, são criados 6 Product_Units distintos
- **Opening_Status**: Estado de abertura de um Product_Unit. Valores possíveis: Pending (cartas não registradas), In_Progress (registro iniciado mas incompleto), Completed (todas as cartas registradas)
- **PokemonTCG_API**: API pública disponível em docs.pokemontcg.io para consulta de dados de cartas e coleções
- **Local_Database**: Banco de dados local que armazena todos os dados importados da PokemonTCG_API, incluindo Collections e Cards
- **Initial_Import**: Processo de importação inicial de todas as Collections e Cards da PokemonTCG_API para o Local_Database, executado na primeira inicialização da aplicação
- **Sync**: Processo de atualização do Local_Database com novos dados da PokemonTCG_API, executado manualmente pelo usuário para incorporar novas coleções lançadas
- **LigaPokemon**: Portal de compra e venda de cartas em https://www.ligapokemon.com.br/
- **Price_Scraper**: Componente responsável por realizar webscraping no LigaPokemon para obter preços atualizados
- **Card_Library**: Tela de visualização de todas as cartas da User_Collection
- **Dashboard**: Tela inicial da aplicação

---

## Requirements

### Requirement 1: Tela Inicial (Dashboard)

**User Story:** Como usuário, quero ver na tela inicial um resumo de todas as minhas coleções, para ter uma visão geral do meu investimento em cartas.

#### Acceptance Criteria

1. THE Dashboard SHALL exibir todas as Collections nas quais o usuário possui ao menos uma Card.
2. WHEN o Dashboard é carregado, THE App SHALL consultar a User_Collection e calcular o total de Cards distintas por Collection.
3. WHEN o Dashboard é carregado, THE App SHALL calcular e exibir o valor total em Cards por Collection com base no último preço registrado de cada Card.
4. THE Dashboard SHALL exibir, para cada Collection, o nome da coleção, a quantidade de Cards distintas e o valor total estimado.
5. WHEN nenhuma Card está registrada na User_Collection, THE Dashboard SHALL exibir uma mensagem indicando que nenhuma coleção foi encontrada.
6. THE Dashboard SHALL exibir uma seção de pendências contendo todos os Product_Units com Opening_Status igual a Pending ou In_Progress.
7. THE Dashboard SHALL exibir, para cada Product_Unit pendente ou em progresso, o ID do Product_Unit, o tipo de TCG_Product, a Collection associada e a data da compra.
8. WHEN o usuário seleciona um Product_Unit com Opening_Status Pending ou In_Progress na seção de pendências, THE App SHALL direcionar o usuário para a tela de registro de cartas daquele Product_Unit.

---

### Requirement 2: Registro de Compras de Produtos TCG

**User Story:** Como usuário, quero registrar os produtos TCG que comprei (boosters, blisters, ETBs, booster boxes, tins, decks e outros) com data e valor pago, para controlar meu investimento.

#### Acceptance Criteria

1. THE App SHALL permitir que o usuário registre uma Purchase informando o tipo de TCG_Product (Booster, Blister, ETB, Booster_Box, Tin, Starter_Deck, Bundle ou outro tipo disponível na Liga Pokémon), a Collection associada, a quantidade de unidades, o valor pago por unidade e a data da compra.
2. THE App SHALL oferecer uma lista predefinida de tipos de TCG_Product para seleção, incluindo ao menos: Booster, Blister, ETB, Booster_Box, Tin, Starter_Deck e Bundle.
3. WHERE o tipo de TCG_Product não estiver na lista predefinida, THE App SHALL permitir que o usuário informe um tipo personalizado como texto livre.
4. WHEN uma Purchase é registrada, THE App SHALL criar automaticamente N Product_Units correspondentes à quantidade de unidades informada, cada um com um ID único gerado automaticamente e Opening_Status igual a Pending.
5. WHEN uma Purchase é registrada, THE App SHALL persistir os dados localmente.
6. WHEN uma Purchase é salva com sucesso, THE App SHALL redirecionar o usuário para iniciar o registro de cartas do primeiro Product_Unit da Purchase.
7. THE App SHALL exibir o histórico de Purchases ordenado por data decrescente.
8. WHEN o usuário seleciona uma Purchase, THE App SHALL exibir os detalhes da compra incluindo tipo de TCG_Product, Collection, quantidade, valor unitário, valor total e a lista de Product_Units associados com seus respectivos Opening_Status.
9. IF a Collection informada não existir na PokemonTCG_API, THEN THE App SHALL exibir uma mensagem de erro indicando que a coleção não foi encontrada.

---

### Requirement 3: Registro de Cartas Obtidas em Produtos TCG

**User Story:** Como usuário, quero registrar as cartas que obtive ao abrir produtos TCG (boosters avulsos, blisters, ETBs, booster boxes e outros produtos que contenham boosters), para saber exatamente o que tenho na minha coleção.

#### Acceptance Criteria

1. THE App SHALL permitir que o usuário registre as Cards obtidas ao abrir um Product_Unit vinculado a uma Purchase, desde que o TCG_Product contenha Boosters (Booster, Blister, ETB, Booster_Box, Tin ou Bundle).
2. WHEN o usuário inicia o registro de cartas de um Product_Unit com Opening_Status Pending, THE App SHALL atualizar o Opening_Status do Product_Unit para In_Progress.
3. WHEN o usuário registra uma Card obtida, THE App SHALL adicionar a Card à User_Collection com quantidade incrementada, armazenando o ID do Product_Unit de origem e a data e hora do registro.
4. THE App SHALL permitir registrar múltiplas cópias da mesma Card em uma única sessão de abertura de um Product_Unit.
5. WHEN uma Card é registrada, THE App SHALL buscar os dados da Card na PokemonTCG_API e armazenar nome, número, imagem e coleção localmente.
6. IF a Card informada não for encontrada na PokemonTCG_API, THEN THE App SHALL exibir uma mensagem de erro indicando que a carta não foi localizada.
7. THE App SHALL exibir a lista de Cards registradas por Product_Unit aberto.
8. THE App SHALL permitir que o usuário pause o registro de um Product_Unit e retome em qualquer momento, mantendo o Opening_Status como In_Progress.
9. WHEN o usuário conclui o registro de cartas de um Product_Unit, THE App SHALL permitir que o usuário marque o Product_Unit como Completed, atualizando o Opening_Status para Completed.
10. WHERE o TCG_Product for do tipo Starter_Deck, THE App SHALL permitir que o usuário registre as Cards do deck sem associação a Boosters individuais.

---

### Requirement 4: Biblioteca de Cartas

**User Story:** Como usuário, quero visualizar todas as cartas da minha coleção em modo lista ou grade, para navegar facilmente pelo meu acervo.

#### Acceptance Criteria

1. THE Card_Library SHALL exibir todas as Cards presentes na User_Collection.
2. THE Card_Library SHALL oferecer alternância entre visualização em grade e visualização em lista.
3. WHEN a visualização em grade está ativa, THE Card_Library SHALL exibir a imagem de cada Card obtida via PokemonTCG_API.
4. WHEN a visualização em lista está ativa, THE Card_Library SHALL exibir nome, número, Collection, quantidade em posse e último preço registrado de cada Card.
5. THE Card_Library SHALL permitir filtrar Cards por Collection.
6. THE Card_Library SHALL permitir buscar Cards por nome ou número.
7. WHEN uma Card não possui imagem disponível na PokemonTCG_API, THE Card_Library SHALL exibir uma imagem padrão de substituição.

---

### Requirement 5: Atualização de Preços via Webscraping

**User Story:** Como usuário, quero atualizar os preços das cartas de uma coleção com um clique, para saber o valor atual do meu acervo.

#### Acceptance Criteria

1. THE App SHALL exibir um botão de atualização de preços para cada Collection presente na User_Collection.
2. WHEN o usuário aciona o botão de atualização de preços de uma Collection, THE Price_Scraper SHALL acessar a URL correspondente no LigaPokemon no formato `https://www.ligapokemon.com.br/?view=cards/search&card=edid={edid}%20ed={tag}`.
3. WHEN a página do LigaPokemon é carregada, THE Price_Scraper SHALL selecionar a opção de visualização em lista para garantir que todas as cartas estejam visíveis na mesma página.
4. WHEN a listagem está disponível, THE Price_Scraper SHALL extrair o menor preço disponível de cada Card listada na página.
5. WHEN o menor preço de uma Card é extraído, THE Price_Scraper SHALL também extrair o link de redirecionamento para a página de compra da Card no LigaPokemon.
6. WHEN a extração é concluída, THE App SHALL atualizar o preço de cada Card da Collection na User_Collection com o menor valor encontrado e armazenar o link de compra correspondente.
7. THE App SHALL atualizar somente as Cards da Collection que já estão presentes na User_Collection.
8. IF o LigaPokemon retornar erro ou a página não estiver acessível, THEN THE Price_Scraper SHALL exibir uma mensagem de erro indicando a falha na atualização.
9. WHEN a atualização de preços é concluída, THE App SHALL exibir a data e hora da última atualização para a Collection correspondente.
10. THE App SHALL exibir o link de compra do LigaPokemon junto ao preço de cada Card atualizada, permitindo redirecionamento ao portal.

---

### Requirement 6: Criação e Gerenciamento de Decks

**User Story:** Como usuário, quero criar decks utilizando as cartas que já possuo, para organizar minhas estratégias de jogo.

#### Acceptance Criteria

1. THE App SHALL permitir que o usuário crie um Deck com nome definido pelo usuário.
2. THE App SHALL permitir adicionar Cards ao Deck somente a partir das Cards presentes na User_Collection.
3. WHILE um Deck está sendo editado, THE App SHALL exibir a quantidade total de Cards adicionadas ao Deck.
4. THE App SHALL limitar cada Deck a no máximo 60 Cards.
5. IF o usuário tentar adicionar uma Card que resultaria em mais de 60 Cards no Deck, THEN THE App SHALL exibir uma mensagem informando que o limite de 60 cartas foi atingido.
6. THE App SHALL permitir adicionar até 4 cópias da mesma Card em um Deck, exceto Cards com a regra de cópia única.
7. THE App SHALL permitir que o usuário remova Cards de um Deck.
8. THE App SHALL permitir que o usuário renomeie ou exclua um Deck existente.
9. THE App SHALL exibir a lista de todos os Decks criados pelo usuário.
10. WHEN o usuário visualiza um Deck, THE App SHALL exibir todas as Cards do Deck com nome, quantidade e imagem.

---

### Requirement 7: Registro de Trocas de Cartas

**User Story:** Como usuário, quero registrar trocas de cartas, para manter meu acervo atualizado após negociações.

#### Acceptance Criteria

1. THE App SHALL permitir que o usuário registre uma Trade selecionando uma ou mais Cards da User_Collection que serão cedidas.
2. THE App SHALL permitir que o usuário adicione manualmente uma ou mais Cards recebidas na Trade, informando nome, número e Collection.
3. WHEN uma Trade é confirmada, THE App SHALL remover as Cards cedidas da User_Collection e adicionar as Cards recebidas à User_Collection.
4. WHEN uma Card recebida via Trade é adicionada, THE App SHALL buscar os dados da Card na PokemonTCG_API e armazenar nome, número, imagem e coleção localmente.
5. IF a Card recebida não for encontrada na PokemonTCG_API, THEN THE App SHALL permitir o registro da Trade com os dados informados manualmente, sem imagem.
6. THE App SHALL exibir o histórico de Trades com data, Cards cedidas e Cards recebidas.
7. WHEN o usuário visualiza uma Trade no histórico, THE App SHALL exibir os detalhes completos da troca.

---

### Requirement 8: Integração com a PokemonTCG API

**User Story:** Como usuário, quero que os dados de cartas e coleções sejam obtidos automaticamente da API oficial, para garantir informações precisas.

#### Acceptance Criteria

1. THE App SHALL consultar o Local_Database para obter a lista de Collections disponíveis.
2. WHEN o usuário busca uma Card, THE App SHALL consultar o Local_Database utilizando nome ou número da carta como parâmetro de busca.
3. THE App SHALL exibir as imagens das Cards utilizando as URLs de imagem armazenadas no Local_Database.
4. IF a PokemonTCG_API estiver indisponível durante o Initial_Import ou Sync, THEN THE App SHALL exibir uma mensagem de erro e permitir que o processo seja retomado posteriormente.

---

### Requirement 9: Importação Inicial e Sincronização de Dados

**User Story:** Como usuário, quero que a aplicação importe automaticamente todos os dados de coleções e cartas na primeira execução, para que a busca e o registro de cartas funcionem sem depender de chamadas em tempo real à API.

#### Acceptance Criteria

1. WHEN o App é iniciado pela primeira vez e o Local_Database está vazio, THE App SHALL iniciar automaticamente o processo de Initial_Import.
2. WHEN o Initial_Import está em execução, THE App SHALL importar todas as Collections disponíveis na PokemonTCG_API para o Local_Database.
3. WHEN uma Collection é importada, THE App SHALL importar todos os dados de Cards dessa Collection (nome, número, URL de imagem, raridade e tipo) para o Local_Database.
4. WHILE o Initial_Import está em execução, THE App SHALL exibir o progresso ao usuário no formato "Importando coleção X de Y: [nome da coleção]".
5. WHILE o Initial_Import está em execução, THE App SHALL permitir que o usuário utilize as funcionalidades da aplicação com os dados já importados até o momento.
6. WHEN o Initial_Import ou Sync é concluído com sucesso, THE App SHALL armazenar a data e hora da última sincronização no Local_Database.
7. THE App SHALL exibir a data da última sincronização na interface do usuário.
8. THE App SHALL disponibilizar uma opção manual para iniciar um Sync, permitindo que o usuário atualize o Local_Database com novas Collections lançadas após o Initial_Import.
9. IF o Initial_Import falhar parcialmente, THEN THE App SHALL registrar o ponto de interrupção e permitir que o processo seja retomado a partir da última Collection importada com sucesso.
