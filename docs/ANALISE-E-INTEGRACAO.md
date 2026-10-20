# VagasMZ — análise e preparação da integração

Actualização posterior: o redesign da imagem de referência foi aplicado localmente.
Ver [redesign implementado](REDESIGN-IMPLEMENTADO.md). O diagnóstico abaixo regista
o estado da importação e as limitações que continuam relevantes.

Data: 19 de Outubro de 2026, África/Maputo. Âmbito: ZIP anexado e repositório
[DomingosSarama/vagasmz](https://github.com/DomingosSarama/vagasmz).

## Resultado e comparação com o GitHub

A main consultada continha apenas `README.md` (81 bytes), no commit
`b64ba5b3f4d863e7da821ac550ae9053a2ac5150` (Initial commit). Não existia aplicação,
pipeline ou esquema de dados remoto para conciliar. A integração parte desse commit
e conserva as duas linhas do README, acrescentando instruções próprias do VagasMZ.

Foi criada apenas uma branch local, `codex/integracao-ai-studio`. Não houve push,
PR, merge, publicação, configuração de alojamento ou alteração remota da main.
O projecto está no directório local `outputs/vagasmz` desta conversa.

O ZIP tinha 24 225 397 bytes e SHA-256
`f170ad3b7964d49d8a23435c25ab30fb99f60a9ba4978de53dc3722d6614b8b4`.
Foram extraídos 233 ficheiros com validação de caminhos antes da extracção.
O original extraído foi conservado separadamente em `work/export-original`.

Foram excluídos da integração os 192 ficheiros de `.aistudio/` (23 438 920 bytes),
que contêm capturas, referências visuais e notas do ambiente de criação, e `dev-dist/`,
que contém ficheiros gerados. Não são necessários para executar a aplicação.
O `bun.lock` original foi substituído pelo fluxo npm com `package-lock.json`.
Não foram incluídos ficheiros de ambiente privados, bases pessoais ou respostas brutas dos feeds.

## Estrutura e funcionalidades

| Componente | Implementação e comportamento observado |
| --- | --- |
| Interface | React 19, TypeScript, Vite 8, Tailwind 4 e Lucide; tema escuro/claro, sidebar e navegação móvel |
| Servidor | Express 4 e tsx; sincronização, extracção por URL e importação manual; porta 3000 |
| Persistência | Dexie/IndexedDB: vagas, guardadas, candidaturas, perfis, preferências, empresas e fontes |
| Descoberta | Painel, pesquisa textual, filtros por localização/área/contrato/modalidade, ordenação e estágios |
| Organização | Guardadas e notas, candidaturas em lista/Kanban, estados, contactos, entrevistas, histórico e checklist |
| Assistência | Compatibilidade por regras, lacunas de competências, alertas locais e cartas por modelo |
| Exportação | jsPDF, ficheiros ICS e backup JSON |
| Offline/PWA | Manifesto e service worker manual; dados locais no navegador |

`@google/genai` estava declarado, mas não era chamado pelo código. As cartas e a
compatibilidade não são resultados de um modelo Gemini. `dotenv`, `motion`, o plugin
PWA e autoprefixer também não tinham utilização activa e foram retirados. A PWA
mantém o manifesto e service worker existentes. Foram mantidas as funcionalidades,
sem apresentar estas regras como inteligência artificial generativa.

O preto `#000000` e a sidebar de 256 px já estavam presentes no ZIP. A preparação
não representa um redesign visual completo; esse trabalho está definido no plano anexo.

## Integridade das vagas e dos feeds

### Exemplos que eram apresentados como dados reais

`src/data/seedCatalog.ts` incluía seis vagas com empresas, salários, benefícios,
prazos e URLs escritos no código. Todas tinham `provenance: real_verified` e
`isDemo: false`, apesar de pertencerem a `DEMONSTRATION_JOBS`:

- Vodacom — Engenheiro de Software Júnior;
- Millennium bim — Programador Full-Stack;
- Standard Bank — Graduate Trainee de dados;
- Mozal — Técnico de Infraestrutura & Redes;
- Cornelder — Estágio de Redes;
- EDM — Analista de Sistemas.

Não foi encontrada evidência de validação destes anúncios específicos. Não se deve
concluir que existem vagas com estes salários, datas ou requisitos apenas porque
o domínio da empresa existe. Quatro candidaturas iniciais também descreviam envios
e até uma entrevista marcada, sem terem sido criadas pelo utilizador.

As seis vagas foram reclassificadas como exemplos, com datas de verificação vazias,
sem alegação de página oficial, e ficam ocultas por defeito. A falta de rede já não
activa o catálogo de exemplos automaticamente. Deixou de haver criação automática
das quatro candidaturas. Instalações antigas conservam essas candidaturas e notas,
mas recebem a marca de exemplo. Candidaturas criadas a partir de um exemplo herdam
essa marca. A correspondência dos exemplos antigos usa os IDs conhecidos; uma cópia
com outro ID num backup antigo pode exigir revisão manual.

O perfil inicial passou a começar sem competências, formação, experiência ou
localizações inventadas. Os perfis já existentes não são reescritos.

### Verificação pontual das fontes

Os cinco endereços responderam HTTP 200 em 19/10/2026, cerca das 19:13 em Maputo.
São resultados pontuais; não garantem disponibilidade futura ou validade de cada anúncio.

| Fonte | Itens na resposta | Observações da análise |
| --- | ---: | --- |
| MMO principal | 30 | Datas entre 11 e 19/10/2026; parser não extraiu prazos |
| MMO pesquisa de estágios | 30 | Datas entre 12/12/2024 e 29/09/2026; inclui anúncios antigos |
| SoVagas | 10 | 9 anúncios após excluir uma publicação de resumo; datas entre 13 e 19/10/2026 |
| Remotive | 12 | O parâmetro `limit=8` não limitou esta resposta; o servidor corta para 8 |
| Jobicy | 8 | Inclui oportunidades internacionais com restrições próprias |

Uma execução do servidor preparado devolveu 49 anúncios: 24 do MMO, 9 do SoVagas,
8 do Remotive e 8 do Jobicy. É a quantidade de registos seleccionados pelo código,
não uma contagem de vagas confirmadas ou necessariamente distintas do mercado.
O servidor limita os resultados por fonte e mantém cache de três minutos.

Na análise integral dos RSS, os 69 registos aceites ficaram sem prazo extraído.
Datas antigas e prazos ausentes impedem afirmar que as candidaturas estão abertas.
Um anúncio pode representar várias posições, e vários portais podem repetir a mesma
oportunidade. O teste de deduplicação não substitui validação humana da publicação.

### Correcções de proveniência

- RSS e APIs agora usam `feed_imported`; importação manual usa `manual_unverified`.
- A interface mostra “por confirmar”, “prazo não informado”, “recolhido em” e fonte original.
- Um link válido ou download bem-sucedido não passa a ser prova de verificação.
- O autor/editor de um RSS deixou de ser utilizado directamente como empregador.
- Deixaram de ser atribuídas cidades a partir da capital de cada província; localização desconhecida fica como “Não informado”.
- Contrato, experiência e benefícios ausentes deixam de receber alguns dos valores genéricos inventados pelos adaptadores.
- Publicações de resumo reconhecíveis são excluídas; isso não constitui um classificador completo de anúncios.
- Os oito registos de empresas são apresentados como directório inicial a confirmar. Os SVGs que imitavam logótipos foram substituídos por iniciais neutras.

Os campos antigos `verifiedAt` e `lastVerifiedAt` continuam no formato para não
quebrar registos e backups, mas representam a data de recolha nos anúncios importados.
Os valores antigos de proveniência continuam aceites pelo tipo por compatibilidade;
a interface já não os transforma automaticamente num selo de verificação.

## Segurança e dependências

A análise textual do ZIP não detectou uma chave real segundo os padrões pesquisados
(Google API, GitHub, AWS, chaves privadas, Bearer e atribuições de credenciais).
A única correspondência foi o placeholder `MY_GEMINI_API_KEY` de `.env.example`.
O exemplo foi substituído por instruções sem chave. Isto é uma verificação por
padrões, não uma garantia forense: imagens não foram analisadas por OCR e formatos
de segredos não reconhecidos podem escapar. Os artefactos AI Studio não entram na branch.

O endpoint original de extracção aceitava qualquer HTTP/HTTPS, incluindo IPs locais,
e seguia redireccionamentos. Isto permitia utilizar o servidor como proxy para serviços
internos (SSRF). A branch usa uma lista exacta de domínios HTTPS conhecidos, bloqueia
credenciais/portas alternativas, rejeita redireccionamentos, limita a resposta a 2 MiB
e mantém o timeout durante a leitura do corpo. Domínios fora da lista usam preenchimento
manual. A lista não comprova que a página contém um anúncio oficial.

O servidor está limitado ao endereço local `127.0.0.1`; não foi preparado como um
serviço público multiutilizador. Chamadas não podem forçar a ignorância da cache.
O service worker já não apaga caches de outras aplicações por terem nomes diferentes,
e o fallback offline foi corrigido. A instalação do service worker fica reservada à
compilação de produção.

`npm install` falhava no export original: `esbuild ^0.25.0` entrava em conflito com
o requisito opcional de Vite 8.3.4 (`^0.27 || ^0.28`). A dependência directa não usada
foi retirada, sem forçar resolução incompatível. O lock npm regista as versões resolvidas.

## Validação realizada e limites

- Verificação TypeScript sem erros.
- 15 testes aprovados: lógica existente, regras de importação, perfil/catálogo inicial,
  preservação de notas, ausência de candidaturas fictícias, proveniência e restrições da extracção.
- Compilação de produção concluída. Permanece um aviso de ficheiro principal com cerca
  de 909 kB minificado (273 kB comprimido), a optimizar no redesign.
- Auditoria npm: zero vulnerabilidades conhecidas reportadas para a árvore instalada nesta data.
- Servidor/API: sincronização HTTP 200, URL interna rejeitada com 400, importação manual
  identificada como não verificada. O anúncio usado no teste manual não foi persistido no catálogo.
- Verificação no navegador: painel, pesquisa por “Bureau”, resultado correspondente e
  detalhe com fonte, prazo ausente e disponibilidade por confirmar.

Não foram ensaiados todos os percursos móveis, leitor de ecrã, instalação PWA,
reabertura sem rede, todos os downloads PDF/ICS ou recuperação integral de backups.
Os testes existentes cobrem conteúdo de calendário/carta, não todos os diálogos de download.

## Trabalho pendente antes de uma publicação

1. **Ciclo de vida dos dados:** separar datas de publicação/recolha/verificação,
   marcar antiguidade e reconfirmar disponibilidade; tratar anúncios removidos ou alterados.
   Actualmente, a sincronização acumula registos e não retira automaticamente os que desaparecem.
2. **Extracção:** parser RSS ainda usa expressões regulares e heurísticas de área,
   competências e empresa; pode classificar mal e trocar responsabilidades por requisitos.
   Usar XML/JSON-LD estruturado, validação de esquema e confiança por campo, com revisão quando necessário.
3. **Elegibilidade remota:** “Africa”, “EMEA” ou “Worldwide” são pistas, não prova de
   contratação de residentes em Moçambique. Confirmar país, fuso e requisitos no anúncio.
4. **Backups:** validar tamanho, esquema e versão antes de escrever; restaurar tudo
   numa transacção. O export actual inclui preferências, mas o restore não as aplica
   integralmente e não transporta fontes/empresas. Um erro pode deixar restauro parcial.
5. **Fontes e regras de uso:** confirmar limites, atribuição e permissões de reutilização
   de cada fornecedor antes de publicar. Não foram certificados nesta análise.
   A configuração `enabled` local não controla a lista fixa de fontes do servidor.
6. **Preparação pública:** autenticação conforme o produto escolhido, controlo de abuso,
   validação de todos os campos do servidor, tratamento de erros e política de dados pessoais.
   A lista de domínios não substitui estas medidas.
7. **Datas e acessibilidade:** normalizar apresentação para `pt-MZ`/África/Maputo,
   esclarecer contagem inclusiva do prazo, foco do modal, teclado e contraste.
8. **PWA e desempenho:** validar cache/actualização/offline no dispositivo e dividir
   carregamento de ecrãs/PDF para reduzir o custo inicial no telemóvel.

## Próximos passos de integração

1. Rever esta branch e o plano de redesign, mantendo uma cópia do backup de dados reais.
2. Com aprovação explícita, fazer push apenas de `codex/integracao-ai-studio` e abrir
   um PR de revisão contra main. Se main avançar entretanto, comparar de novo antes de integrar.
3. Desenvolver o redesign e as correcções pendentes em alterações pequenas e verificáveis.
4. Só publicar um ambiente de revisão após autorização. Merge e produção dependem de nova aprovação explícita.
