# vagasmz
Plataforma inteligente de vagas de emprego e estágios em Moçambique.

Aplicação privada para pesquisar e acompanhar oportunidades, com código na branch
`codex/integracao-ai-studio` e alojamento gratuito no Render.

## Acesso privado e monitorização

O endereço é [vagasmz.onrender.com](https://vagasmz.onrender.com). Em produção,
as páginas, ficheiros e APIs exigem uma sessão do proprietário. A palavra-passe
é configurada exclusivamente como variável secreta `VAGASMZ_ACCESS_PASSWORD`
no painel do Render, com 16 a 128 caracteres; nunca deve entrar no repositório,
em variáveis `VITE_*`, em URLs ou em mensagens de erro. Sem credenciais válidas,
o acesso permanece bloqueado. Não existe registo público de contas.

As sessões usam cookies HttpOnly, Secure em HTTPS e SameSite=Strict, expiram
após 30 minutos de inactividade ou oito horas no total e são revogadas ao sair.
Um reinício do serviço também exige nova entrada. A opção «Sair da sessão» está
no menu do perfil. A API mínima `/healthz` mantém-se pública para o alojamento.

O acesso privado exige Internet. A antiga cache/PWA offline é retirada sem
apagar os dados pessoais do IndexedDB. Cópias que já tenham sido descarregadas
antes da restrição não podem ser revogadas remotamente. A privacidade do site
é independente da visibilidade do repositório GitHub.

A monitorização técnica (estado, publicações, consumo e registos do servidor)
fica no painel privado do Render, acessível pela conta que gere o serviço.

## Executar localmente

Requer Node.js 22.12 ou superior e npm. Validado com Node.js 24.22.0.

```powershell
npm ci
npm run dev
```

Abrir http://127.0.0.1:3000. Não é necessária uma chave Gemini: a implementação
actual usa regras locais para compatibilidade e cartas, e feeds/APIs públicos para anúncios.

```powershell
npm run lint
npm test
npm run build
$env:NODE_ENV = 'production'
npm start
```

Por defeito, o servidor está limitado a `127.0.0.1:3000`. `npm run preview`
serve apenas o frontend; a sincronização/importação exige o servidor Express.
O npm/package-lock.json é o fluxo de instalação desta branch. O lock Bun original
permanece no ZIP de origem, fora desta integração.

## Abrir no telemóvel pela internet

A configuração do plano gratuito do Render está em [render.yaml](render.yaml).
O site e a consulta das fontes funcionam no mesmo serviço, com HTTPS. Consulta os
[passos de publicação e limites gratuitos](docs/PUBLICACAO-GRATUITA.md).
A publicação usa a branch de integração, mantendo a main intacta.

## Dados e funcionalidades

Pesquisa e filtros, catálogo, estágios, favoritos com notas, candidaturas em lista/Kanban,
contactos, entrevistas, checklist, perfil, alertas locais, cartas por modelo,
exportação PDF/calendário, backup JSON e PWA foram mantidos.

Os dados pessoais ficam no IndexedDB do navegador, por origem/dispositivo. A entrada
privada protege o acesso ao site; não há envio automático de candidaturas nem
sincronização de perfis entre dispositivos.
O ZIP de código não transporta o conteúdo do IndexedDB de outra instalação.

As seis vagas incluídas são exemplos identificados e ocultos por defeito. Uma nova
instalação começa sem candidaturas fictícias. Registos de exemplo antigos recebem
a marca de exemplo, conservando as notas existentes. Anúncios externos e manuais
ficam por confirmar; recolher um feed não valida a empresa nem a disponibilidade.

A extracção automática aceita apenas os domínios HTTPS enumerados em
`src/server/safeFetch.ts`, rejeita redireccionamentos e limita tempo e tamanho.
Para outra fonte, usar preenchimento manual, sujeito a confirmação humana dos dados.

## Revisão antes de publicar

- [Análise da origem, comparação e limitações](docs/ANALISE-E-INTEGRACAO.md)
- [Plano de redesign premium](docs/PLANO-REDESIGN.md)
- [Redesign implementado a partir da imagem de referência](docs/REDESIGN-IMPLEMENTADO.md)
- [Correcções dos temas, iluminação da ponte e menu](docs/CORRECCOES-TEMAS.md)

O visual da imagem de referência já foi aplicado localmente: sidebar, barra superior,
hero da ponte, pesquisa verde e cartões. A documentação de análise/plano conserva
o diagnóstico anterior; o registo do redesign descreve a implementação mais recente.

As alterações são revistas na branch de integração. As publicações são manuais,
independentes do merge na main.

## Revisão funcional e de segurança

Consulta [o relatório de testes e correcções](docs/AUDITORIA-SEGURANCA-E-TESTES.md). Inclui os resultados e os limites da revisão local.
