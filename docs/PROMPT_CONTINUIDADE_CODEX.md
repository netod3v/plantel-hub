# Prompt para continuar o trabalho no Plantel Hub

Copie o texto abaixo para continuar este trabalho em outro chat do Codex:

```text
Quero continuar o trabalho no projeto Plantel Hub nesta cópia local. Na auditoria de 2026-10-09, a branch ativa é `feature/sprint--implementações`, rastreando `origin/feature/sprint-0-diagnostico`; confirmar a branch antes de commit ou publicação.

Leia primeiro os documentos em docs/ARQUITETURA_ATUAL.md, docs/FLUXOS_FUNCIONAIS.md, docs/RISCOS_TECNICOS.md, docs/BACKLOG_TECNICO.md, docs/VIABILIDADE_HOSTINGER.md e docs/MANUAL_IMPLEMENTACAO_LIXEIRA_DEMANDAS.md. Depois confira o estado real do git e o diff antes de alterar qualquer coisa.

Leia também docs/MANUAL_NOVO_QUADRO_DEMANDAS.md e o complemento de 09/10/2026 em docs/RELATORIO_AUDITORIA_IMPLEMENTACAO_FASE1.md. A implementação local mais recente inclui quadro de Demandas com cinco colunas, bloqueio com motivo obrigatório, filtro Bloqueadas e aviso de WIP configurável por navegador. A validação em Firebase de homologação continua pendente; não confunda o limite WIP local com uma configuração compartilhada.

O que já foi feito localmente:
- Adicionei uma lixeira lógica para demandas em index.html.
- Ao remover uma demanda, a implementação grava deletedAt e deletedBy, e ela deixa as listas normais.
- A retenção configurada na interface é de 30 dias.
- Usuários que podem alocar a demanda podem restaurá-la dentro do prazo; administradores podem restaurá-la depois.
- Apenas administradores podem apagar definitivamente itens após 30 dias.
- Atualizei indicadores, listas e referências de mural relacionados a demandas excluídas.
- Corrigi o card “Último aviso” do resumo para renderizar Markdown pelo renderizador já existente.
- Escrevi os documentos de auditoria e implementação em docs/.
- Mantive Metas em três colunas e alterei apenas o quadro de Demandas para Backlog, A fazer, Fazendo, Revisão e Concluído; concluídas fora da semana corrente aparecem no histórico por regra de exibição, sem migração.
- A sintaxe do módulo JavaScript e git diff --check passaram; não foram executados testes funcionais/integrados.

Restrições e próximos passos:
- Não publique, faça deploy, altere DNS, Firebase ou dados reais sem autorização explícita e sem validar homologação e backup.
- As regras RTDB atuais, ambiente de homologação e dados de teste ainda não foram fornecidos. Antes de considerar a lixeira pronta para produção, peça as regras (sem credenciais), revise a autorização dos campos deletedAt/deletedBy e valide com contas/dados de homologação.
- Confirme também o plano/domínio da hospedagem e o procedimento de rollback; o repositório sozinho não prova onde a versão ativa está publicada.
- Não diga que testes foram feitos se não foram executados. Faça revisão estática antes de editar e mantenha as mudanças pequenas, pois o app concentra HTML/CSS/JS em index.html.
- A remoção de metas continua definitiva e está fora do escopo implementado.

Primeiro me apresente um resumo curto do estado atual e das dependências para produção. Em seguida, avance no que puder com segurança sem modificar dados reais nem publicar. Faça perguntas apenas quando uma decisão ou acesso realmente bloquear o próximo passo.
```
