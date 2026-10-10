# Fluxos funcionais observados

## Escopo

Este documento descreve os fluxos visíveis no código-base `c42a269` somados às mudanças locais ainda não commitadas. A cópia de trabalho está na branch `feature/sprint--implementações`, que rastreia `origin/feature/sprint-0-diagnostico`. É uma leitura estática; não confirma comportamento em execução nem permissões das regras Firebase.

## Cadastro, autenticação e perfil

1. A pessoa entra com e-mail e senha ou cria uma conta pelo Firebase Authentication.
2. O fluxo de recuperação usa `sendPasswordResetEmail`.
3. Ao autenticar, o código define o UID atual, carrega notas pessoais e garante que exista um nome no perfil `users/{uid}`.
4. O estado de autenticação inicia os listeners quando há usuário e os encerra no logout.

## Demandas

1. A pessoa cria uma demanda com texto, visibilidade opcional, prioridade, prazo e responsável obrigatório. A primeira menção `@Pessoa` preenche a seleção automaticamente; a pessoa pode escolher outro responsável.
2. A gravação vai para `demandas/{id}` ou `demandas_private/{setor}/{id}`.
3. O criador é registrado em `uid` e `author`; responsável é guardado separadamente em `assignedTo`.
4. A demanda pode ser editada, concluída/reaberta e movida entre “A fazer”, “Fazendo” e “Concluído”.
5. O quadro suporta arrastar e soltar e também botões de movimentação.
6. A tela oferece busca, filtro por estado, prioridade, responsável específico, minhas demandas, sem responsável, atrasadas e prazo nesta semana. Busca, prioridade, pessoa e semana também filtram quadro, post-its e histórico.
7. A barra semanal conta demandas não removidas com prazo entre segunda e domingo da semana corrente; mostra quantas foram concluídas sobre esse total. Demandas sem prazo não entram no cálculo. O intervalo usa a data local do navegador.
8. Demandas concluídas podem ser arquivadas em lote e reabertas pelo histórico.
9. A ação “remover demanda” pede confirmação e marca a demanda com `deletedAt` e `deletedBy`. A demanda deixa as listas operacionais e fica disponível na lixeira por 30 dias.
10. Quem pode alocar a demanda pode restaurá-la dentro do prazo; administradores também podem restaurar fora dele e excluir definitivamente itens com mais de 30 dias. A exclusão definitiva usa `remove()`.
11. Registros antigos sem responsável recebem um aviso e podem ser localizados pelo filtro “Sem responsável”; a interface não os atribui em massa. Edição, conclusão, reabertura e movimentação exigem primeiro escolher um responsável.

## Metas

1. Metas podem ser criadas em caminhos públicos ou privados por setor.
2. O estado concluído é editável manualmente.
3. O resumo de progresso observado conta metas concluídas sobre metas visíveis. Não é calculado a partir de demandas vinculadas.
4. A remoção de meta usa `remove()`.

## Mural e visibilidade

1. Posts públicos usam `posts/{id}`; posts privados usam `posts_private/{setor}/{id}`.
2. O código contém criação e edição de posts, enquetes, menções, comentários e respostas.
3. O texto do mural passa por um renderizador Markdown implementado em `index.html`.
4. Conteúdo privado é assinado por setor; a interface combina os resultados permitidos e trata negações de permissão como esperadas em alguns setores.
5. Não foram verificadas as regras reais que controlam esses caminhos.
6. Ao excluir por uma ação de demanda que controla o post vinculado, a interface limpa essa referência após mover a demanda para a lixeira. Se outro post ainda referenciar uma demanda excluída, ele mostra essa situação. A gravação dos campos novos depende de regras RTDB ainda não revisadas.
7. O card “Último aviso” do resumo renderiza Markdown com o mesmo renderizador do mural e limita visualmente a altura do texto.

## Presença e comunicação

O código mantém presença em `presence`, participantes de chamada em `team_call/participants`, e conversas/mensagens em `conversations` e `dms`. O comportamento e as permissões destes fluxos precisam ser testados com contas distintas antes de alterações nesses dados.

## Permissões observadas na interface

O frontend compara UID do criador, menções, responsável e condição de administrador para habilitar ações. Essas verificações melhoram a interface, mas não substituem autorização no Firebase. A validação final depende das regras do banco.
