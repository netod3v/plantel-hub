# Relatório de auditoria — Plantel Hub / proposta de upgrade

**Data:** 09/10/2026
**Escopo:** alterações locais relacionadas à Fase 1 da proposta de upgrade e estado de versionamento desta cópia.
**Tipo de revisão:** inspeção estática do código e dos documentos. Não é homologação funcional nem auditoria das regras do Firebase.

**Documento de referência:** `C:\Users\Valentim\Desktop\Projetos- Plantel\plantel_hub_proposta_de_upgrade (1).pdf`.

## Resumo executivo

Há implementação local para lixeira de demandas, formatação Markdown do card “Último aviso”, responsável obrigatório com sugestão pela primeira menção, progresso semanal por prazo e filtros complementares. O fluxo de arquivo de demandas já existia no código-base e foi revisado para coexistir com as mudanças.

As alterações passam nas verificações locais de sintaxe JavaScript e de whitespace do diff. **Não há evidência de validação na interface, no Firebase, com usuários distintos ou com demandas privadas.** O projeto aponta para o Firebase usado pela equipe; para proteger os dados, a interface não foi aberta nesta revisão. Portanto, “implementado no código” não significa “homologado” nem “publicado”.

## Estado do repositório

- Commit-base: `c42a269` (`Add files via upload`).
- Branch local ativa: `feature/sprint--implementações`.
- Upstream configurado: `origin/feature/sprint-0-diagnostico`.
- A branch local e o upstream estavam no mesmo commit durante a inspeção; o nome local não coincide com o nome remoto.
- `index.html` tem alterações não commitadas; a pasta `docs/` contém documentação ainda não rastreada pelo Git.
- Não houve commit, push, deploy ou gravação intencional no Firebase nesta revisão.

**Atenção para o próximo commit:** confirme no GitHub Desktop se o destino desejado é a branch remota `feature/sprint-0-diagnostico`. Não crie ou publique uma branch com nome diferente sem conferir.

## Matriz de funcionalidades

| Funcionalidade | Evidência no código | Resultado da auditoria | Situação |
| --- | --- | --- | --- |
| Card “Último aviso” com Markdown | `renderTodayPanel()` usa `renderMarkdown()`; CSS do resumo em torno das linhas 677–681 | O card renderiza pelo renderizador já usado pelo mural. O card já existia no código-base; esta alteração substituiu o texto simples truncado pela renderização Markdown. | Implementado localmente; sem verificação visual |
| Lixeira de demandas | Botão e área em torno das linhas 2488–2495; helpers em 5656 e 6524–6538; render em 6608–6622; ações em 7248–7265 | Exclusão lógica grava `deletedAt`/`deletedBy`; itens saem das telas operacionais; restauração disponível conforme regra de interface; administrador pode apagar definitivamente após 30 dias. A exclusão definitiva é manual, não automática. | Implementado localmente; regras e operações RTDB pendentes |
| Referências do mural à demanda | Render do post em torno da linha 6344; conversão e desfazer em torno das linhas 7206–7230 | Converter post em demanda define responsável (primeira menção ou criador atual). Desfazer move a demanda para a lixeira e limpa a referência após sucesso. | Implementado localmente; sem validação de gravação |
| Arquivo e reabertura | `renderDemandHistory()` e ações `finalize-demandas`/`reopen-batch` em torno das linhas 6590–6605 e 7236–7273 | O arquivo de concluídas já existia no código-base. O fluxo permanece e a reabertura em lote agora impede reabrir cards sem responsável. | Presente no código; revisado estaticamente, sem teste funcional |
| Responsável obrigatório | Formulário em torno das linhas 2506; lógica em 5884–5901, 7060–7110 e ações em 7274–7300 | Novas demandas precisam de responsável. A primeira menção `@Nome` sugere a pessoa; seleção manual pode substituir a sugestão. Alterar, concluir, reabrir ou mover item sem responsável é bloqueado na interface. Registros antigos não são migrados automaticamente. | Implementado localmente; exige homologação e atribuição humana de registros antigos |
| Progresso semanal | `demandWeekRange()`/`demandDueThisWeek()` em 5906–5913; cálculo em 6443–6447 | Denominador: demandas carregadas pela sessão, não removidas, com prazo entre segunda e domingo da semana local do navegador; arquivadas ainda podem contar se estiverem no intervalo. Dados privados só entram se os listeners autorizados os carregarem. Numerador: demandas concluídas. Demandas sem prazo não entram; “fazendo” não conta como concluída. | Implementado localmente; regra confirmada com a escolha do usuário, sem teste visual |
| Filtros por pessoa e semana | Controles em 2477–2480; opções/listeners em 5840–5880; filtro compartilhado em 6450–6480 e 6580–6587 | Acrescentados filtros para pessoa e semana; compõem com busca e prioridade nas visualizações. O quadro no filtro padrão “Em aberto” foi corrigido para não exibir cards concluídos. | Implementado localmente; sem validação visual |
| Filtro de demandas antigas sem responsável | Opção `unassigned` em torno da linha 2477 e marcador em 5917 | Identifica registros legados sem atribuir pessoa. A edição de itens arquivados permite corrigir o responsável antes de reabrir. | Implementado localmente; requer revisão dos dados com a equipe |

## Funcionalidades já presentes no código-base

A inspeção do código-base `c42a269` já encontrou mural, metas, demandas em lista/quadro/post-its, prioridades, prazos, busca, filtros de estado, “minhas” e atrasadas, conclusão e arquivo de demandas, renderizador Markdown do mural e card “Último aviso”. Esta auditoria não atribui a criação histórica desses componentes às alterações atuais. O diff atual muda o Markdown do card, complementa filtros, progresso e responsabilidade, e adiciona a lixeira.

## Verificações executadas

1. `node --check` sobre o conteúdo do `<script type="module">` extraído temporariamente de `index.html`: **passou**. O arquivo temporário foi removido.
2. `git diff --check`: **passou**.
3. Conferência estática dos controles de lixeira, filtro de pessoa/estado, campo de responsável, barra semanal e card “Último aviso”: elementos encontrados no HTML.
4. Revisão estática dos handlers de exclusão/restauração, arquivo/reabertura, filtros, criação/edição de demanda e renderização do aviso.

Essas verificações não executam nem simulam o navegador, autenticação, regras ou banco de dados.

## Itens não validados / riscos

- `index.html` configura `databaseURL` como `https://plantel-hub-default-rtdb.firebaseio.com` (em torno da linha 2612). Não foi aberta a aplicação nem iniciada uma sessão, para evitar acesso ao banco real.
- Não há `firebase.json`, regras RTDB/Storage, scripts de teste ou configuração do Emulator Suite nesta cópia.
- As verificações de permissão no JavaScript controlam a interface e **não substituem as regras Firebase**. Não se pode concluir pela inspeção que dados ou ações estão protegidos no servidor.
- A gravação e a restauração dependem de as regras atuais aceitarem `deletedAt`/`deletedBy`. O purge usa remoção definitiva após a condição de prazo verificada no cliente; a política não foi testada contra chamadas diretas ou regras do servidor.
- Não foram testadas demandas privadas, perfis distintos, restauração fora do prazo, limites semanais, combinação de filtros, Markdown no navegador ou falha parcial ao limpar referências do mural.
- A interface usa o nome de perfil para detectar a primeira menção. Nomes duplicados ou alterações de nome podem tornar a correspondência ambígua; o campo permite corrigir manualmente.
- A atribuição das demandas antigas sem responsável requer uma lista atual e decisão de quem assume cada item. Não foram lidos dados do banco nem feitas atribuições.
- Não foi confirmado ambiente de hospedagem, backup, processo de publicação ou rollback.

## Próximas ações para fechar a Fase 1

1. Configurar ou indicar um Firebase de homologação separado (ou Emulator Suite), com regras e contas de teste; não compartilhar senhas, tokens ou chaves privadas.
2. Testar na interface: responsável com/sem menção, filtros em lista/quadro/post-its/histórico, bordas da semana, arquivamento, lixeira/restauração, card Markdown e referências de mural.
3. Repetir os fluxos com usuários e setores de teste com permissões diferentes; registrar resultados e erros das regras.
4. Exportar ou listar demandas sem responsável e informar a pessoa responsável por cada uma; então atualizar os registros com aprovação da equipe.
5. Confirmar o destino de branch, revisar o diff, commitar, e só então decidir sobre publicação e smoke test pós-deploy.

## Complemento de auditoria — quadro de Demandas (09/10/2026)

Este complemento registra a implementação local posterior à auditoria inicial, baseada na proposta visual de cinco colunas. O commit-base desta etapa é `8f76ab7`; as alterações desta etapa estão locais e ainda não commitadas. Não houve acesso ao Firebase, publicação ou alteração de dados reais.

| Item | Implementação observada | Situação |
| --- | --- | --- |
| Quadro de Demandas | Colunas Backlog, A fazer, Fazendo, Revisão e Concluído; Metas preservam o quadro de três colunas. Controles existentes e drag-and-drop usam as colunas por tipo. | Implementado localmente; teste visual/funcional pendente |
| Compatibilidade | `todo`, `doing` e `done` preservados; status ausente segue derivado de `done`. Sem migração em massa. Backlog não define `done`. | Revisado estaticamente |
| Conclusão e arquivo | Coluna Concluído mostra itens com `doneAt` ou fallback `archivedAt` na semana local. Outros concluídos aparecem no histórico; datas ausentes ficam como desconhecidas. A separação é computada, não gravada. | Revisado estaticamente; conferir registros legados em homologação |
| Bloqueio | Campos aditivos `blocked`, `blockReason`, `blockedAt`, `blockedBy`; motivo obrigatório (máximo 500 caracteres), edição/desbloqueio, destaque e filtro. Bloqueadas não podem ser concluídas sem desbloquear. | Implementado localmente; regras e perfis não validados |
| WIP | Campo configurável na coluna Fazendo; chave `plantel_demand_wip_limit` em `localStorage`; aviso ao atingir/superar limite, sem travar movimentação. | Implementado localmente; configuração é individual por navegador |
| Filtros e privacidade | Filtro de bloqueadas e contagem calculada sobre demandas já carregadas pela sessão; filtros anteriores mantidos. | Revisado estaticamente; privacidade exige teste com regras e contas separadas |

O novo quadro e o bloqueio **não** são considerados homologados nem prontos para produção. A autorização do frontend não substitui as regras RTDB. Consultar também `MANUAL_NOVO_QUADRO_DEMANDAS.md`.

## Escopo do PDF ainda não implementado

O bloqueio com motivo obrigatório e o quadro de cinco colunas foram implementados localmente, mas precisam de homologação. Permanecem no backlog: demandas recorrentes; ligação entre demandas e metas com progresso calculado; cartões gerenciais de atrasadas/bloqueadas; projetos e marcos; notificações automáticas. Também não estão confirmadas as validações de hospedagem, deploy e rollback.

## Documentos relacionados

- `ARQUITETURA_ATUAL.md` — estrutura e integrações observadas.
- `FLUXOS_FUNCIONAIS.md` — fluxos existentes no código.
- `BACKLOG_TECNICO.md` — tarefas, dependências e status.
- `MANUAL_IMPLEMENTACAO_LIXEIRA_DEMANDAS.md` — funcionamento e pontos de alteração.
- `MANUAL_NOVO_QUADRO_DEMANDAS.md` — colunas, bloqueio, WIP, compatibilidade e pontos de configuração.
- `RISCOS_TECNICOS.md` — riscos e validações pendentes.
- `VIABILIDADE_HOSTINGER.md` — avaliação preliminar da hospedagem.
- `PROMPT_CONTINUIDADE_CODEX.md` — contexto para continuidade do trabalho.
