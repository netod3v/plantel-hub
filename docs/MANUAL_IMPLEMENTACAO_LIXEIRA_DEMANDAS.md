# Manual de implementação — lixeira de demandas

Este manual registra o que foi alterado nesta entrega, como a lixeira funciona e onde ajustar o comportamento. O código principal está concentrado em `index.html`.

## Resumo do que foi feito

- Criado um botão **Lixeira** na área de demandas; o número acompanha os itens que o usuário atual pode administrar.
- Demandas removidas passam a receber os campos `deletedAt` (data/hora em milissegundos) e `deletedBy` (UID de quem removeu), em vez de serem apagadas imediatamente.
- Demandas marcadas como excluídas deixam de aparecer nos quadros e listas operacionais, nos indicadores, notificações e áreas pessoais que usam o conjunto ativo.
- A tela da lixeira apresenta conteúdo, autor da exclusão, data e prazo.
- Usuários autorizados podem restaurar a demanda durante os primeiros 30 dias. Administradores podem restaurar também depois desse prazo.
- Somente administradores podem apagar definitivamente, e o botão aparece depois de 30 dias. A operação pede confirmação.
- Ao transformar um post do mural em demanda e depois desfazer, a demanda também vai para a lixeira. Referências do mural são tratadas na interface.
- O card “Último aviso” do resumo agora usa o renderizador Markdown já utilizado no mural.
- Nova demanda exige responsável; ao digitar a primeira menção `@Pessoa`, a seleção de responsável acompanha essa pessoa. É possível escolher outra pessoa manualmente.
- A interface impede salvar uma demanda sem responsável e impede concluir, reabrir ou mover demandas antigas sem responsável. O filtro “Sem responsável” e o aviso no card ajudam a equipe a localizar esses registros para atribuição manual.
- O progresso semanal considera demandas não removidas com prazo de segunda a domingo da semana local do navegador. O numerador é a quantidade concluída; itens sem prazo não entram.
- O filtro por pessoa e o filtro por semana também funcionam junto com busca e prioridade nas visualizações de lista, quadro, post-its e histórico.
- Metas continuam com o comportamento anterior: sua remoção ainda é definitiva.

## Fluxo de dados

1. Remover uma demanda grava `deletedAt` e `deletedBy` no mesmo caminho em que ela já existe: `demandas/{id}` ou `demandas_private/{setor}/{id}`.
2. O carregamento dos dados continua vindo dos listeners existentes do Realtime Database.
3. `activeDemandas()` filtra os objetos sem `deletedAt`; as telas operacionais usam esse helper.
4. A lixeira consulta as demandas carregadas e renderiza as que o usuário pode administrar.
5. Restaurar limpa `deletedAt` e `deletedBy` (grava `null` nesses campos), fazendo a demanda reaparecer no fluxo normal.
6. Apagar definitivamente usa `remove()` no registro, após checagem da interface e confirmação.

## Onde mudar

As referências abaixo são aproximadas e podem mudar conforme o arquivo for editado. Procure pelos nomes listados no arquivo `index.html`.

| O que mudar | Onde procurar | Dica |
| --- | --- | --- |
| Duração de retenção | `DEMANDA_TRASH_RETENTION_DAYS` e `DEMANDA_TRASH_RETENTION_MS` | Troque o número de dias. Atualize também os textos `30 dias` da interface, mensagens, confirmação e documentação para manter tudo coerente. |
| Quem pode excluir para a lixeira | `moveDemandToTrash(item)` e o manipulador `remove-demanda` | A regra de interface atual usa `canAllocateDemand`, que considera criador, responsáveis/mencionados e administradores conforme as funções atuais. |
| Quem pode restaurar | `canRestoreDemand(item)` | Hoje, quem pode alocar a demanda restaura dentro do prazo; `isAdmin()` permite restauração depois do prazo. |
| Quem pode apagar definitivamente | manipulador `purge-demanda` | Hoje exige administrador e idade de pelo menos 30 dias. Mantenha a verificação também no manipulador, não só esconda o botão. |
| Aparência e layout | CSS `.demand-trash`, `.demand-trash-item`, `.demand-trash-actions`, `.demand-trash-note` | Há uma regra responsiva na media query para telas estreitas. |
| Texto, datas e botões | `renderDemandTrash(items)` | Altera rótulos, metadados, aviso de retenção e estrutura visual da lixeira. |
| Filtragem de itens excluídos | `activeDemandas()` | Se adicionar novas telas de demandas, use a coleção ativa ou filtre `deletedAt`, para evitar que excluídas reapareçam. |
| Botão e contador | busca por `demand-trash-btn` e `render()` | O botão abre a lixeira e exibe a contagem autorizada. |
| Remover ou restaurar referência de post | manipuladores `remove-demanda` e `undo-demanda`; trecho de status de demanda no mural | Se alterar a relação entre post e demanda, revise os três locais e evite apagar o post do mural por engano. |
| Responsável obrigatório e sugestão por menção | `firstMentionedUid()`, `syncDemandAssigneeFromMention()`, `submitDemanda()` e manipuladores `toggle-demanda`/`save-demanda-edit` | A detecção é baseada no nome de perfil exato após `@`. Registros antigos sem responsável não são atribuídos automaticamente. |
| Opções de pessoa nos filtros e formulários | `refreshSectorOptions()` e `demandUserOptions()` | O filtro lista perfis não banidos que já foram carregados pela aplicação. |
| Semana considerada no progresso e filtro | `demandWeekRange()`, `demandDueThisWeek()` e bloco `weeklyDemandas` em `render()` | Usa a semana local do navegador, de segunda a domingo; altere esses helpers em conjunto se mudar o critério ou fuso. |
| Composição dos filtros nas visualizações | `matchesDemandFilters()` e criação de `filteredDemandas` dentro de `render()` | Busca, prioridade, pessoa e semana são combinadas. O filtro de estado é aplicado à lista operacional. |

## Como testar com segurança

Faça os testes somente com conta e registros de homologação ou dados descartáveis. Não use uma demanda de produção para experimentar a exclusão.

1. Abra a aplicação e entre com uma conta que tenha permissão para administrar uma demanda de teste.
2. Crie uma demanda descartável, remova-a e confirme que ela some do quadro e aparece na lixeira.
3. Restaure-a e confirme que volta ao fluxo operacional com seus campos anteriores.
4. Confirme que uma conta sem permissão não vê ou não consegue acionar ações que não lhe cabem.
5. Com administrador e dados próprios de homologação, simule um registro antigo para conferir o botão de exclusão definitiva. Não altere a data de uma demanda real.
6. Verifique também registros públicos e privados, e posts do mural associados a demandas.

Não foi possível validar Firebase, permissões ou dados privados: não há regras RTDB nem projeto de homologação configurado nesta cópia. A sintaxe do módulo JavaScript (`node --check`) e `git diff --check` passaram. A confirmação funcional dos filtros, arquivo, lixeira e Markdown ainda precisa ser feita na interface com dados de teste.

## Limites e cuidados antes da publicação

- As regras reais do Realtime Database não estão no repositório. Elas precisam permitir atualização dos campos novos, respeitando o modelo de autorização vigente. A interface, sozinha, não fornece segurança de servidor.
- Para homologar, use um projeto Firebase separado da equipe (ou Firebase Emulator) com regras e contas descartáveis. “Homologação” significa uma cópia de teste onde podemos criar, alterar e excluir demandas sem afetar os dados usados no trabalho. Não envie senhas, chaves privadas ou tokens.
- Não foi testado o comportamento com contas diferentes nem dados privados reais.
- Não foi confirmado o plano/domínio da Hostinger, o destino atual de produção, backup ou rollback.
- Esta alteração está local, sem commit, na branch `feature/sprint--implementações`, que rastreia `origin/feature/sprint-0-diagnostico`; não foi publicada.
- A lixeira não apaga registros automaticamente ao completar 30 dias. Após o prazo, a exclusão definitiva é uma ação manual exclusiva de administrador.
- A exclusão definitiva e a limpeza de referências externas não formam uma transação distribuída; revise esse fluxo com as regras e dados de homologação antes de usar em produção.

## Outros documentos desta entrega

- `ARQUITETURA_ATUAL.md`: estrutura e integrações observadas no repositório.
- `FLUXOS_FUNCIONAIS.md`: principais fluxos visíveis no código.
- `RISCOS_TECNICOS.md`: riscos e validações ainda necessárias.
- `BACKLOG_TECNICO.md`: prioridades e dependências.
- `VIABILIDADE_HOSTINGER.md`: avaliação preliminar da hospedagem estática.
