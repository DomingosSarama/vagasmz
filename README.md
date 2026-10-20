# vagasmz
Plataforma inteligente de vagas de emprego e estágios em Moçambique.

Implementação importada do Google AI Studio, preparada localmente na branch
`codex/integracao-ai-studio`. A main original foi conservada.

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
A branch pode ser publicada mantendo a main intacta. O link público só será confirmado
após a criação do serviço e os testes no alojamento.

## Dados e funcionalidades

Pesquisa e filtros, catálogo, estágios, favoritos com notas, candidaturas em lista/Kanban,
contactos, entrevistas, checklist, perfil, alertas locais, cartas por modelo,
exportação PDF/calendário, backup JSON e PWA foram mantidos.

Os dados pessoais ficam no IndexedDB do navegador, por origem/dispositivo. Não há conta,
login, envio automático de candidaturas nem sincronização de perfis entre dispositivos.
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

Esta branch foi preparada para revisão local. Push, abertura de PR e publicação
dependem da aprovação explícita do proprietário. Merge na main exige aprovação separada.

## Revisão funcional e de segurança

Consulta [o relatório de testes e correcções](docs/AUDITORIA-SEGURANCA-E-TESTES.md). Inclui os resultados e os limites da revisão local.
