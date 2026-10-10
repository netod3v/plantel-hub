# Arquitetura atual do Plantel Hub

## Escopo e evidência

Auditoria estática do código-base `c42a269`, em 2026-10-09. A cópia de trabalho está na branch local `feature/sprint--implementações`, que rastreia `origin/feature/sprint-0-diagnostico`; as mudanças descritas nos documentos ainda não estão commitadas. O repositório contém `index.html` (cerca de 754 KB) e um `README.md` mínimo. Não há checkout anterior nem regras do Firebase versionadas para comparar.

As conclusões abaixo são fatos do código observado, salvo quando marcadas como inferência ou pendência. A sintaxe JavaScript e o diff foram verificados localmente; não foram executados testes de comportamento nem acessado o Console Firebase.

## Tecnologias confirmadas

- HTML, CSS e JavaScript concentrados em `index.html`.
- Firebase JavaScript SDK 10.13.0 importado como módulos ES do CDN `gstatic.com`.
- Firebase Authentication para e-mail/senha, cadastro, logout e recuperação de senha.
- Firebase Realtime Database para dados compartilhados e privados.
- Firebase Analytics inicializado.
- Google Fonts carregadas externamente.
- O bucket aparece na configuração do Firebase, mas não foi encontrado uso do SDK Firebase Storage.
- Não foram encontrados manifests de dependências, scripts de build/teste, regras Firebase ou configuração versionada de deploy na raiz.

## Componentes e responsabilidades

`index.html` contém a interface, estilos, renderização e lógica de eventos. O mesmo arquivo inicializa serviços Firebase e define os listeners, as verificações de autorização na interface, os fluxos de edição e os componentes de mural, metas, demandas, presença e conversas.

Pontos de referência no arquivo:

| Linhas aproximadas | Responsabilidade |
| --- | --- |
| 2590–2616 | Imports e inicialização Firebase |
| 2618–2632 | Perfil em `users/{uid}` |
| 3272–3302 | Estado de autenticação e ciclo dos listeners |
| 5643–5647 | Caminhos públicos/privados de posts, metas e demandas |
| 5671–5723 | Assinatura dos dados privados por setor |
| 5760–5814 | Listeners de dados em tempo real |
| 6390–6450 | Filtros, ordenação e renderização das demandas |
| 6467–6518, 6624–6653 | Quadro e movimentação de cartões |
| 6988–6995 | Criação de demandas |
| 7154 em diante | Conclusão, edição, arquivamento e remoção |

## Integrações e dados

O código usa estes caminhos, entre outros:

- `users/{uid}` para perfil e atributos de usuário.
- `posts/{id}`, `metas/{id}` e `demandas/{id}` para itens públicos.
- `posts_private/{setor}/{id}`, `metas_private/{setor}/{id}` e `demandas_private/{setor}/{id}` para itens privados por setor.
- `presence`, `team_call/participants`, `conversations/{uid}`, `dms/{id}` e `contactNicknames/{uid}` para presença e comunicação.
- `personal_demands/{uid}` e `private_notes/{uid}` para dados pessoais.

O código observa dados em tempo real com `onValue` e grava por `set`, `update` e `remove`. As regras efetivas do banco não podem ser inferidas dessas chamadas.

## Modelo atual de demandas

Campos observados: `text` (conteúdo/título), `author` e `uid` (criador), `ts`, `done`, `status`, `priority`, `dueDate`, `assignedTo`, `mentions`, `doneAt`, `archived`, `archivedAt`, `archiveBatch`, `deletedAt` e `deletedBy`. Os dois últimos são adicionados pela implementação local da lixeira lógica. A localização privada é representada pelo caminho do banco e pelo setor associado ao objeto carregado.

Compatibilidade observada: demandas sem `status` usam `done` para derivar o status; prioridade ausente usa `medium`; prazo e responsável são opcionais. `assignedTo` guarda o UID como chave de um objeto. As prioridades aceitas pelo formulário incluem `urgent`, `high`, `medium` e `low`.

Metas usam `text`, `author`, `uid`, `ts`, `done` e `mentions`. Não foi encontrada ligação de dados entre demanda e meta nem cálculo de progresso da meta a partir de demandas.

## Limitações e itens a confirmar

- Regras reais do Realtime Database e do Storage.
- Se o Storage é usado fora deste repositório.
- Estrutura real e sensibilidade de todos os registros existentes.
- Comportamento de login, permissões e operações em contas de usuários distintos.
- Domínio e provedor que servem a versão ativa. Metadados do repositório apontam para uma página Vercel, mas isso não comprova o destino atual.
- Processo local de desenvolvimento, testes, backup e publicação.
