# Viabilidade preliminar da Hostinger

## Estado atual confirmado

O repositório contém uma página HTML com CSS e JavaScript incorporados. O código importa módulos Firebase pelo CDN e usa Authentication e Realtime Database no navegador. Analytics também é inicializado. Não foi encontrado backend próprio, processo Node persistente, arquivo de build, configuração Firebase versionada ou configuração de deploy na raiz.

## Avaliação preliminar

**Inferência:** a arquitetura atual parece compatível com hospedagem estática que sirva `index.html` por HTTPS. Não há evidência no repositório de que seja necessário criar backend para servir a aplicação. A compatibilidade final depende do plano contratado, domínio, HTTPS, política de cabeçalhos e configuração atual do Firebase.

O repositório aponta para uma página Vercel nos metadados do GitHub. Isso não confirma onde a aplicação está publicada hoje. A auditoria não acessou o painel da Hostinger nem realizou deploy.

## Informações necessárias antes de preparar produção

1. Qual plano Hostinger foi contratado e se ele oferece hospedagem estática/publicação de arquivos.
2. Qual domínio ou subdomínio será usado e quem controla o DNS.
3. Se o certificado HTTPS está ativo ou pode ser habilitado no plano.
4. Onde a versão atual está hospedada e como é publicada.
5. Se o projeto Firebase tem os domínios autorizados para Authentication atualizados para o novo domínio.
6. Quais são as regras efetivas de Realtime Database e Storage.
7. Qual ambiente de homologação será usado sem alterar dados reais.
8. Como fazer backup dos dados e restaurar a versão anterior dos arquivos.

## Estratégia proposta, sem execução

1. Confirmar hospedagem, domínio e processo atual.
2. Revisar domínios autorizados do Firebase Authentication e regras do banco, sem expor segredos.
3. Preparar homologação com HTTPS e validar login, leitura/escrita autorizadas, visibilidade, demandas, metas e mural.
4. Registrar um pacote/versão anterior recuperável e um procedimento de rollback.
5. Publicar somente após aprovação explícita, validação de homologação e confirmação de backup.

## Limitações

Não é possível confirmar custos, limites, suporte ou disponibilidade do plano Hostinger sem os dados da conta/plano. Não há publicação, mudança de domínio, DNS ou configuração Firebase nesta etapa.
