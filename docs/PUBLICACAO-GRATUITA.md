# Publicação gratuita do VagasMZ

Preparação: 20 de Outubro de 2026. Destino: um único Web Service do Render no plano **Free**, a partir de `DomingosSarama/vagasmz`, branch `codex/integracao-ai-studio`.

## Estado e configuração concreta

O ficheiro [render.yaml](../render.yaml) prepara o site e o servidor em conjunto. Não cria bases de dados, discos, tarefas pagas nem serviços adicionais. Não é necessário comprar domínio: o Render atribui um endereço HTTPS `onrender.com`. Esse endereço só fica conhecido depois de criar o serviço; não existe ainda um link público confirmado.

O proprietário autorizou em 20 de Outubro de 2026 apenas o envio da branch ao GitHub. A publicação no Render não está autorizada nesta etapa e nenhum alojamento foi activado. A main não precisa de ser substituída nem de receber merge para publicar esta branch no futuro. Os deploys automáticos estão desactivados: um futuro push não publica alterações sem um novo deploy manual. Em Blueprints, manter também a sincronização automática desactivada no painel.

Configuração do serviço:

| Campo | Valor |
|---|---|
| Tipo | Web Service |
| Repositório | `https://github.com/DomingosSarama/vagasmz` |
| Branch | `codex/integracao-ai-studio` |
| Runtime | Node.js 24.22.0 |
| Região | Frankfurt |
| Plano | **Free** |
| Build | `npm ci --include=dev && npm run check && npm run build` |
| Início | `npm start` |
| Health check | `/healthz` |
| Variável explícita | `NODE_ENV=production` |

O servidor lê `PORT` e o endereço `RENDER_EXTERNAL_URL` fornecidos pelo Render. Aceita apenas o domínio público exacto, conserva os bloqueios a ficheiros internos, valida a origem dos pedidos e encaminha HTTP público para HTTPS. A confiança em um proxy aplica-se ao ambiente Render; por defeito, o modo local permanece em `127.0.0.1`.

Para um domínio próprio futuro, configurar `PUBLIC_URL=https://dominio-autorizado` no serviço, sem caminho, query ou credenciais. Não usar listas de origens abertas nem `trust proxy=true`. Os cabeçalhos de proxy só são fiáveis quando o acesso passa pelo proxy da plataforma.

## Etapas finais

1. Confirmar o envio da branch preparada ao repositório e, separadamente, a publicação gratuita. Manter a main intacta.
2. Entrar na conta Render do proprietário. Se for necessário criar conta, o proprietário deve concluir os termos e eventuais verificações. Não partilhar palavras-passe ou chaves no chat.
3. Criar um Web Service com o repositório público e os valores acima, ou rever o Blueprint. Escolher explicitamente **Free** e não adicionar cartão, recursos pagos ou upgrades.
4. Aguardar build e deploy; verificar `/healthz`, página inicial, ícones/PWA e `/api/sources/sync` pelo endereço HTTPS atribuído.
5. Confirmar as fontes que efectivamente respondem a partir do alojamento. Um fornecedor pode bloquear um endereço do datacenter mesmo que responda localmente. Conservar «por confirmar» nos anúncios e mostrar as falhas das fontes sem inventar substitutos.
6. Abrir o link no telemóvel e testar pesquisa, favoritos, temas e instalação. Só depois comunicar que a publicação está concluída.

Se o fornecedor exigir pagamento ou cartão, interromper essa criação: a autorização é apenas para opções gratuitas.

## Comportamento e limites conhecidos

- A recolha usa os feeds e APIs reais existentes. Actualiza-se quando o utilizador consulta/sincroniza, com cache de três minutos para respeitar as fontes. Não é um serviço de recolha contínua com o site parado.
- O plano Free pode suspender a instância após 15 minutos sem tráfego; a primeira abertura seguinte demora aproximadamente um minuto. O serviço está sujeito às quotas gratuitas. Não foi configurado qualquer mecanismo artificial para impedir a suspensão.
- Perfil, favoritos, candidaturas e notas continuam no navegador de cada dispositivo. Para transferir os teus dados do PC para o telemóvel, usar Exportar/Restaurar Backup. Publicar não coloca estes dados no repositório nem os torna visíveis a todos.
- Os dados locais aparecem antes de esperar pelos feeds. Pedidos à API têm limite de tempo; uma falha de rede conserva o catálogo já guardado. As importações são unificadas numa transacção para não perder actualizações concorrentes.
- Os testes locais simulam o proxy HTTPS e vários clientes, mas não substituem a verificação do endereço público depois do deploy. Os checks GitHub Actions só podem ser confirmados depois do envio autorizado.

## Validação local desta preparação

**50 testes aprovados**, incluindo os testes anteriores e novos casos de configuração Render, HTTPS, Host/Origin, proxy, health check, limitação por cliente, ligações lentas/canceladas e importações concorrentes. A verificação de tipos e a compilação de produção passaram. Mantém-se um aviso de dimensão do bundle, sem erro de compilação.

## Referências do fornecedor

- [Render: serviços gratuitos e limites](https://render.com/docs/free)
- [Render: aplicações Express](https://render.com/docs/deploy-node-express-app)
- [Render: especificação do Blueprint](https://render.com/docs/blueprint-spec)
- [Render: variáveis fornecidas pela plataforma](https://render.com/docs/environment-variables)
- [Render: health checks e cabeçalho Host](https://render.com/docs/health-checks)
- [Express: configuração de proxies](https://expressjs.com/en/guide/behind-proxies/)
