# Publicação gratuita do VagasMZ

Publicado em 20 de Outubro de 2026: **[https://vagasmz.onrender.com](https://vagasmz.onrender.com)**.

Um único Web Service do Render no plano **Free**, a partir de `DomingosSarama/vagasmz`, branch `codex/integracao-ai-studio`. Versão inicial da aplicação: `13b058624c91074c1865f1c0ccf62bce8833b4ba`.

## Estado e configuração concreta

O site e o servidor funcionam no mesmo serviço, com HTTPS no endereço atribuído pelo Render. A configuração corresponde ao [render.yaml](../render.yaml), sem bases de dados, discos ou serviços pagos adicionais.

A publicação usa a branch de integração, mantendo a main intacta. Os deploys automáticos estão desactivados: um push não publica alterações sem um novo deploy manual. O repositório público foi ligado directamente, sem instalar uma aplicação com acesso adicional aos repositórios.

Configuração do serviço:

| Campo | Valor |
|---|---|
| Tipo | Web Service |
| Endereço público | `https://vagasmz.onrender.com` |
| Repositório | `https://github.com/DomingosSarama/vagasmz` |
| Branch | `codex/integracao-ai-studio` |
| Runtime | Node.js 24.22.0 |
| Região | Frankfurt |
| Plano | **Free** |
| Build | `npm ci --include=dev && npm run check && npm run build` |
| Início | `npm start` |
| Health check | `/healthz` |
| Variável explícita | `NODE_ENV=production` |
| Versão explícita | `NODE_VERSION=24.22.0` |
| Auto-Deploy | **Off** |

O servidor lê `PORT` e o endereço `RENDER_EXTERNAL_URL` fornecidos pelo Render. Aceita apenas o domínio público exacto, conserva os bloqueios a ficheiros internos, valida a origem dos pedidos e encaminha HTTP público para HTTPS. A confiança em um proxy aplica-se ao ambiente Render; por defeito, o modo local permanece em `127.0.0.1`.

Para um domínio próprio futuro, configurar `PUBLIC_URL=https://dominio-autorizado` no serviço, sem caminho, query ou credenciais. Não usar listas de origens abertas nem `trust proxy=true`. Os cabeçalhos de proxy só são fiáveis quando o acesso passa pelo proxy da plataforma.

## Actualizações e operação

1. Rever e testar as alterações na branch de integração.
2. Publicar manualmente pelo painel do Render quando a nova versão estiver pronta.
3. Confirmar `/healthz`, a página inicial, os ícones/PWA e `/api/sources/sync` pelo endereço HTTPS.
4. Testar os temas, a pesquisa e as vagas guardadas, incluindo num ecrã de telemóvel.
5. Verificar as fontes que respondem a partir do alojamento. Um fornecedor pode bloquear o datacenter mesmo que responda localmente. Conservar «por confirmar» nos anúncios e mostrar falhas sem inventar substitutos.

Manter o serviço no plano **Free** e não activar recursos pagos ou recargas automáticas.

## Comportamento e limites conhecidos

- A recolha usa os feeds e APIs reais existentes. Actualiza-se quando o utilizador consulta/sincroniza, com cache de três minutos para respeitar as fontes. Não é um serviço de recolha contínua com o site parado.
- O plano Free pode suspender a instância após 15 minutos sem tráfego; a primeira abertura seguinte demora aproximadamente um minuto. O serviço está sujeito às quotas gratuitas. Não foi configurado qualquer mecanismo artificial para impedir a suspensão.
- Perfil, favoritos, candidaturas e notas continuam no navegador de cada dispositivo. Para transferir os teus dados do PC para o telemóvel, usar Exportar/Restaurar Backup. Publicar não coloca estes dados no repositório nem os torna visíveis a todos.
- Os dados locais aparecem antes de esperar pelos feeds. Pedidos à API têm limite de tempo; uma falha de rede conserva o catálogo já guardado. As importações são unificadas numa transacção para não perder actualizações concorrentes.
- As verificações do GitHub Actions e os 50 testes executados no Render passaram na versão inicial. A verificação pública confirmou o funcionamento do servidor e da recolha de oportunidades.

## Validação da publicação inicial

**50 testes aprovados**, incluindo os testes anteriores e novos casos de configuração Render, HTTPS, Host/Origin, proxy, health check, limitação por cliente, ligações lentas/canceladas e importações concorrentes. A verificação de tipos e a compilação de produção passaram. Mantém-se um aviso de dimensão do bundle, sem erro de compilação.

O endereço público respondeu com sucesso na página inicial e em `/healthz`. A API devolveu 49 oportunidades, provenientes de quatro fontes consultadas com sucesso no momento da verificação; a quantidade varia com as fontes. Os anúncios permanecem por confirmar, sem equivaler a validação pela entidade empregadora. Os pedidos a `/.env`, `/server.ts` e `/package.json` devolveram 404. A pesquisa por empresa, a mudança de tema e a gravação/remoção de favoritos foram verificadas no navegador; o layout móvel foi verificado a 390 px, sem excesso horizontal.

## Referências do fornecedor

- [Render: serviços gratuitos e limites](https://render.com/docs/free)
- [Render: aplicações Express](https://render.com/docs/deploy-node-express-app)
- [Render: especificação do Blueprint](https://render.com/docs/blueprint-spec)
- [Render: variáveis fornecidas pela plataforma](https://render.com/docs/environment-variables)
- [Render: health checks e cabeçalho Host](https://render.com/docs/health-checks)
- [Express: configuração de proxies](https://expressjs.com/en/guide/behind-proxies/)
