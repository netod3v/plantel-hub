# Manual do novo quadro de Demandas

**Data:** 09/10/2026  
**Escopo:** implementação local do quadro Kanban de cinco colunas, bloqueio e limite WIP em `index.html`.

## O que mudou

- O quadro de Demandas tem **Backlog**, **A fazer**, **Fazendo**, **Revisão** e **Concluído**. Metas continuam com o Kanban de três colunas.
- Controles e arrastar e soltar movem Demandas entre as cinco colunas. Concluir atualiza `status`, `done` e `doneAt`; sair de Concluído limpa a data e os dados de arquivamento como no fluxo existente. Backlog não significa conclusão.
- Bloqueio não cria coluna adicional. Exige motivo não vazio de até 500 caracteres; mostra motivo e destaque visual. Usuários autorizados podem editar o motivo ou desbloquear.
- Fazendo exibe ocupação e limite WIP. Ao alcançar ou ultrapassar o limite, mostra aviso sem impedir movimentações.
- Concluído mostra itens com `doneAt` (ou `archivedAt`, se necessário) na semana local atual, de segunda a domingo. Os demais concluídos aparecem no histórico pesquisável; itens sem data ficam no grupo “data desconhecida”. A separação é calculada na tela sem migrar ou atualizar registros.
- A barra de progresso semanal permanece independente: continua usando demandas com prazo na semana corrente.

## Compatibilidade e dados

Não existe migração em massa. `todo`, `doing` e `done` mantêm o significado anterior (A fazer, Fazendo e Concluído); objetos antigos sem `status` continuam usando `done` para derivar o status. `backlog` e `review` só são gravados ao mover cards para essas colunas. Campos existentes como `archived`, `deletedAt` e `deletedBy` são preservados.

O bloqueio usa os campos aditivos `blocked`, `blockReason`, `blockedAt` e `blockedBy`. A autorização continua seguindo as funções já existentes no frontend, que não substituem as regras de servidor do Realtime Database.

## Configurar o limite WIP

O campo **Limite WIP** no cabeçalho de Fazendo salva um inteiro positivo no `localStorage` do navegador atual, sob `plantel_demand_wip_limit`. Apagar o valor deixa a coluna sem limite. O valor não é compartilhado entre pessoas/dispositivos. A ocupação considera apenas demandas ativas com status Fazendo carregadas pela sessão.

## Onde alterar

| Necessidade | Referência em `index.html` |
| --- | --- |
| Colunas e rótulos | `DEMAND_KANBAN_COLUMNS` |
| Limite WIP | `DEMAND_WIP_LIMIT_KEY`, `getDemandWipLimit()` e listener de `#demand-wip-limit` |
| Semana e separação do histórico | `demandCompletedThisWeek()`, `isDemandInHistory()` e `demandHistoryGroupKey()` |
| Cartões/ações de bloqueio | `renderKanbanBoard()`, `demandBlockActionsHtml()` e `demandDetailsHtml()` |
| Ações e validações de status | handlers `block-demanda`, `unblock-demanda`, `reopen-batch` e `setItemStatus()` |
| Filtro Bloqueadas | select `demand-status-filter`, render de Demandas e `matchesDemandFilters()` |

## Validação e limites

O código foi revisado estaticamente. A aplicação autenticada não foi aberta porque a configuração local aponta ao Firebase usado pela equipe. Não houve acesso ou alteração de dados reais. Permissões, demandas privadas, regras dos campos novos e apresentação visual precisam de validação em Emulator Suite ou Firebase de homologação separado. O limite WIP é local ao navegador.
