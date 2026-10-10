# Backlog técnico revisado

As estimativas são iniciais e dependem da obtenção das regras Firebase e de um ambiente de teste. Capacidade planejada: 6 horas por semana, conforme horários livres da planilha. Não estão incluídas horas extras.

| ID | Tarefa | Prioridade | Dependências | Estimativa | Critério de aceite | Teste necessário | Risco | Status |
| --- | --- | --- | --- | ---: | --- | --- | --- | --- |
| S0-SEC | Obter e revisar regras RTDB/Storage; identificar homologação e backup | Alta | Acesso do responsável ao Console Firebase | 1–2 h | Regras e limites de acesso documentados sem credenciais; homologação definida | Usuários com permissões diferentes leem e alteram somente dados autorizados | Alto | Pendente de acesso |
| S0-HOST | Confirmar plano Hostinger, domínio, HTTPS e processo atual | Alta | Informações do plano e hospedagem atual | 1 h | Requisitos e rollback documentados | Checklist de pré-publicação validado sem deploy | Médio | Pendente de informação |
| S1-TRASH | Lixeira lógica e restauração para demandas | Alta | S0-SEC; decisão de retenção e autorização | 4–6 h | Excluir logicamente oculta da lista padrão, preserva campos, permite restaurar; somente usuários autorizados executam ações | Fluxo público e privado, restauração, item antigo, referência de mural e permissões | Alto | Implementado localmente; validação RTDB pendente |
| S1-MD | Renderizar Markdown no último aviso | Baixa | Renderizador existente no mural | 1 h | Último aviso do resumo formata títulos, listas e ênfase sem exibir marcadores Markdown | Conferir texto com título, negrito, lista, link e texto simples | Baixo | Implementado localmente; verificação integrada pendente |
| S1-DOC | Documentar política de retenção e comportamento de exclusão | Alta | Decisão humana sobre retenção | 1 h | Prazo de retenção, recuperação e exclusão definitiva definidos | Revisão dos casos de aceite e linguagem da interface | Médio | Documentado localmente; validação integrada pendente |
| S1-OWNER | Tornar responsável obrigatório e sugerir a primeira pessoa mencionada | Alta | Definição de tratamento de demandas antigas | 2–3 h | Nova demanda exige responsável; primeira menção seleciona a pessoa; mudanças de estado bloqueadas sem responsável | Criar com/sem menção, trocar responsável, concluir, reabrir, card antigo sem responsável e demanda privada | Alto | Implementado localmente; validar no Firebase de teste |
| S1-WEEK | Calcular progresso semanal por prazo | Média | Definição do denominador semanal | 1–2 h | Barra usa demandas ativas com prazo de segunda a domingo da semana corrente; percentual é concluídas/total | Semana vazia, prazos nas bordas, concluída e em aberto; conferir fuso local | Médio | Implementado localmente; validar na interface |
| S1-FILTER | Completar filtros de demandas por pessoa e semana | Média | S1-OWNER, S1-WEEK | 1–2 h | Pessoa e semana filtram lista, quadro, post-its e histórico junto à busca/prioridade | Cada visualização; combinação de filtros e perfil com dados privados | Alto | Implementado localmente; validar no Firebase de teste |
| S2-BLOCK | Bloqueio de demanda com motivo obrigatório | Alta | Regras e desenho do modelo aprovados | 4–6 h | Demanda bloqueada exige motivo e fica visível no filtro/resumo aprovado | Motivo vazio/preenchido, dados antigos e visibilidade privada | Médio | Backlog |
| S2-META | Vincular demandas a metas e calcular progresso | Alta | Modelo aprovado; regras; UX definida | 6–10 h | Progresso calculado apenas com demandas vinculadas e não excluídas | Adição/remoção de vínculo, conclusão, restauração e privacidade | Alto | Backlog |
| S2-REC | Modelos recorrentes com geração idempotente | Alta | Decisão de execução agendada/backend e regras | 8–12 h | No máximo uma demanda por ciclo; pausa e encerramento preservam histórico | Reexecução, fuso `America/Sao_Paulo`, virada de ciclo e falha parcial | Alto | Backlog |
| S3-SUM | Resumo gerencial de atrasadas e bloqueadas respeitando visibilidade | Média | S1-TRASH, S2-BLOCK; regras confirmadas | 4–6 h | Cartões levam a listas filtradas e não revelam dados privados | Comparar resumo para perfis/setores distintos | Alto | Backlog |
| S3-PROJECT | Projetos e marcos | Baixa | Necessidade validada pela equipe e modelo aprovado | 8–12 h | Marcos e responsáveis ficam visíveis conforme permissões | Datas, alterações, visibilidade | Médio | Backlog |
| S3-NOTIFY | Notificações automáticas mínimas | Baixa | Regras, canal e preferências definidos | 8–12 h | Envio opt-in, sem repetição diária indevida | Duplicidade, preferências, atraso e erros de entrega | Alto | Backlog |

## Já encontrado no código; não reimplementar sem necessidade

- Prazo, prioridade e filtro de atrasadas (implementação já existente).
- Busca e filtros por estado/“minhas”; filtros por pessoa e semana foram completados localmente nesta revisão.
- Quadro de três colunas com movimentação por botões e arrastar e soltar.
- Arquivo e reabertura de demandas concluídas.
- Renderizador Markdown para texto do mural.

Esses itens precisam de validação funcional, mas não são lacunas confirmadas pela inspeção do código.

## Sprint 1 proposta

**Objetivo:** reduzir perda acidental de demandas, exigir responsável em novas alterações e mostrar o progresso da semana, sem alterar dados existentes em massa.

**Capacidade:** até 6 horas em uma semana, incluindo revisão, testes e documentação. A implementação do fluxo de lixeira foi feita localmente; validação integrada continua pendente.

1. Se S0-SEC não estiver concluído, não iniciar gravações ou publicar: revisar as regras e decidir o teste de homologação (pré-requisito).
2. Decisão local adotada: retenção de 30 dias; restauração por usuários autorizados durante o prazo e por administradores após ele; purge definitivo apenas por administrador, após 30 dias.
3. Implementação local: lixeira e restauração; responsável obrigatório ao criar/editar/mudar estado; pré-seleção pela primeira menção; progresso semanal por prazo; filtros por pessoa e semana.
4. Demandas antigas sem responsável são apenas sinalizadas e filtráveis. Atribuição deve ser feita por alguém da equipe com contexto, sem migração automática.
5. Validar demandas públicas/privadas, registros antigos, referências, filtros e permissões em Firebase de teste; documentar o resultado antes da publicação.

Se a implementação exceder 4 horas ou depender de mudança nas regras, dividir em duas semanas, mantendo WIP = 1. A proposta atual limita a Sprint 1 a demandas; lixeira de metas fica para decisão separada.

## Decisões e dependências restantes antes da publicação

- Regras atuais do Firebase e forma segura de homologação.
- Confirmar regras do RTDB para os novos campos e os papéis usados na lixeira.
- Confirmar o plano de hospedagem e o processo de deploy/rollback.
- Confirmar que os 6 horários semanais da planilha são a capacidade real.
