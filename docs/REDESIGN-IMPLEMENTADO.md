# Redesign visual a partir da referência

Implementado localmente em 19/10/2026, na branch `codex/integracao-ai-studio`.
Referência: imagem fornecida pelo utilizador, gerada anteriormente na conversa “Usar Codex”.

## Alterações

- Sidebar preta fixa, marca VagasMZ com verde, grupos e ícones da referência,
  opção de recolher/expandir e cartão “A ligar talentos a Moçambique”.
- Barra superior com pesquisa funcional, atalho `/`, alternância de tema,
  estado da ligação e menu do perfil. O avatar utiliza iniciais ou um ícone neutro.
- Hero com fundo nocturno da ponte, frase manuscrita, título branco/verde,
  pesquisa com contorno e botão verdes e filtros com ícones.
- Quatro cartões por linha no computador, duas colunas em ecrãs intermédios e
  uma coluna no telemóvel; títulos, empresa, competências, salário, prazo e acções
  organizados segundo a referência.
- Estágios imediatamente a seguir aos destaques. Recomendações e anúncios recentes
  mantidos, assim como resumo pessoal, fontes, favoritos, candidaturas e exportações.
- Atalho “Publicar Vaga” abre o formulário de importação existente, com indicação
  explícita de que adiciona um anúncio ao catálogo local. “Sala da Empresa” abre
  o directório de empresas existente; não foi inventado um portal empresarial com login.

O aspecto segue a composição fornecida. O conteúdo continua a vir dos dados do
sistema. Não foram copiados salários, prazos, fotografias de perfil ou anúncios
fictícios da imagem. Os selos dos cartões indicam incerteza e mantêm “Anúncio por
confirmar” ou “Exemplo”. As iniciais coloridas não são logótipos oficiais.

## Fundo da ponte

Ficheiro: [`public/images/maputo-night.png`](../public/images/maputo-night.png).
Imagem ilustrativa gerada com a ferramenta integrada de geração de imagens,
usando a imagem fornecida como referência de composição. Não é uma fotografia
documental nem uma captura de um acontecimento. O ficheiro foi copiado para o
projecto e não depende do caminho interno da ferramenta.

Prompt utilizado:

> Use case: photorealistic-natural. Asset type: background photograph for the VagasMZ website hero. Input image is a UI design reference ONLY. Create ONLY the clean photographic scene visible in the upper-right hero of the reference: the Maputo–Katembe suspension bridge at night, viewed from Maputo's waterfront, bridge towers and elegant cables, warm amber lights reflected on very dark bay water, city buildings on the right, dark foreground trees. Match the reference composition and moody photographic lighting very closely. Wide panoramic 3:1 landscape, high resolution. Keep the left quarter mostly very dark near-black sky/water as negative space. The bridge and skyline occupy the right two thirds. Dark charcoal sky, golden tiny lights, realistic photography. Absolutely NO user interface, NO letters, NO text, NO slogan, NO logo, NO cards, NO border. It will be overlaid by functional HTML.

## Verificação

TypeScript e compilação de produção concluídos sem erros; os 15 testes de lógica,
persistência e segurança continuam aprovados. Verificados no navegador a pesquisa
“Bureau”, o estado de guardar/remover, a abertura de detalhes e o atalho para o
formulário local. A grelha e o hero foram inspeccionados em pré-visualizações com
larguras de computador e telemóvel. O ficheiro de pré-visualização foi apenas uma
ferramenta temporária de verificação, sem fazer parte do código entregue.

Continuam aplicáveis os limites documentados em `ANALISE-E-INTEGRACAO.md`, incluindo
validação de backups, ciclo de vida dos anúncios e verificação de todas as funções
offline/PWA. O ficheiro principal da aplicação ainda provoca o aviso de tamanho
da compilação, já existente antes do redesign.

Nenhuma alteração foi enviada ao GitHub, incorporada na main ou publicada.
