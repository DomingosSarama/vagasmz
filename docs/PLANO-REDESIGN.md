# VagasMZ — plano de redesign premium

Actualização: a estrutura visual baseada na imagem fornecida foi implementada.
Ver [registo do redesign](REDESIGN-IMPLEMENTADO.md). O plano abaixo conserva as
etapas propostas; os pontos de dados, backups e validação pública continuam pendentes.

Proposta de 19/10/2026. A base já tem preto verdadeiro e sidebar; a prioridade é
melhorar hierarquia, descoberta e confiança dos dados, preservando os percursos existentes.
Este documento é o plano de execução; o redesign completo ainda não foi implementado.

## Direcção visual

- Fundo principal `#000000`; sidebar `#080808`; cartões `#111111`; superfícies `#181818`.
- Texto principal `#FFFFFF`, secundário `#A3A3A3`; rever o cinzento `#737373` em texto pequeno.
- Bordas discretas `#282828`, estados de foco bem visíveis e cor de destaque actual
  `#C5F27A` usada com moderação em acções/selecção. Reservar âmbar para incerteza/prazos.
- Usar Inter para interface e Sora nos títulos, com uma escala curta e espaçamento
  consistente de 4/8 px; reduzir o número de pesos e tamanhos concorrentes.
- Ícones da mesma família e iniciais neutras; logótipos reais apenas com origem e uso confirmados.

## Organização e pesquisa

No computador, manter sidebar entre 232 e 256 px com grupos Descobrir, A minha carreira
e Conta. Mostrar a pesquisa no topo da área principal, acompanhada por localização,
modalidade e tipo de oportunidade. Resumir os restantes filtros em etiquetas removíveis.
Evitar que o painel seja dominado por uma área introdutória demasiado alta.

A página de resultados deve permitir ler uma lista e abrir o detalhe num painel ao
lado em ecrãs largos. Em tablet, usar duas colunas de cartões quando houver espaço;
no telemóvel, uma coluna e detalhe em ecrã completo. A sidebar passa a menu acessível,
com pesquisa sempre fácil de alcançar e botões com área mínima de cerca de 44 px.

Manter pesquisa por cargo, empresa e competência, normalização de acentos, província,
cidade, área, contrato, estágio/emprego, modalidade, experiência, salário e ordenação.
Acrescentar estado dos dados: exemplos, prazo conhecido, anúncio antigo e elegibilidade
remota por confirmar. Diferenciar “nenhum resultado” de “fonte indisponível”.

Persistir filtros na URL para voltar à pesquisa ou partilhá-la. Implementar atraso curto
na pesquisa, contagem estável dos resultados e opção clara para limpar filtros.
A ordenação “mais recentes” deve corresponder à data; prioridade nacional deve ser
uma escolha explícita, não uma alteração silenciosa da ordem.

## Cartões e detalhe

Cada cartão deve conter, nesta ordem: empresa, título, localização/modalidade,
tipo de oportunidade, salário quando divulgado, até três competências e prazo.
Incluir fonte, data de recolha e estado “por confirmar” sem transformar o cartão num
conjunto de selos. Um prazo ausente nunca deve aparecer como “candidaturas abertas”.

Manter duas acções fáceis de distinguir: Guardar e Ver detalhes. Acompanhar adiciona
um registo pessoal e deve explicar que não envia uma candidatura. Abrir anúncio na
fonte deve indicar o domínio de destino; um agregador não deve ser apresentado como
o formulário oficial do empregador.

No detalhe, separar conteúdo transcrito e campos inferidos. Dar prioridade à descrição
original e à rastreabilidade. Compatibilidade deve ser identificada como cálculo por
regras e só deve ganhar destaque depois de o perfil ser preenchido. Não inferir formação,
competências, salário, cidade ou benefícios do utilizador/empregador para preencher espaços.

## Sequência de implementação

| Etapa | Entrega | Critério de aceitação |
| --- | --- | --- |
| 1 — Dados | Estados de recolha, antiguidade, campos desconhecidos, validação de importação/backup | Um anúncio sem prazo ou evidência nunca aparece confirmado; restauro é atómico |
| 2 — Estrutura visual | Tokens, tipografia, sidebar, cabeçalho, pesquisa e navegação móvel | Percursos principais utilizáveis a 360, 768 e 1440 px, sem deslocamento horizontal |
| 3 — Descoberta | Filtros na URL, cartões e detalhe ao lado | Pesquisa/guardar/voltar preservam os filtros e o contexto |
| 4 — Carreira | Guardadas, Kanban/lista, contactos, entrevistas, checklist e alertas | Dados e IDs conservados; adicionar, editar e mover não perdem notas/histórico |
| 5 — Perfil e exportação | Perfil inicial vazio, correspondência explicada, cartas, PDF/ICS e backup | Nenhum dado profissional é inventado; exportações mantêm caracteres portugueses e datas correctas |
| 6 — Qualidade | PWA/offline, teclado, foco, contraste, estados de erro e desempenho | Testes dos percursos abaixo aprovados num ambiente autorizado |

## Percursos que não podem regredir

1. Pesquisar com acentos e sem acentos, combinar filtros, ordenar, abrir detalhe e voltar.
2. Guardar/remover uma vaga, adicionar nota e reencontrá-la depois de recarregar.
3. Criar candidatura própria ou a partir de anúncio, mudar estado, manter histórico,
   contactos, entrevista, próxima acção e documentos.
4. Editar perfil sem impor competências/locais por defeito e explicar a compatibilidade.
5. Gerar carta editável e exportar PDF/ICS sem alegar envio ou entrevista confirmada.
6. Exportar, validar e restaurar backup com rollback em caso de ficheiro inválido.
7. Consultar estado de cada fonte quando só uma falha; conservar dados locais e indicar antiguidade.
8. Activar exemplos explicitamente e ver a mesma marca nos cartões e nas candidaturas derivadas.
9. Instalar/reabrir a PWA, consultar o catálogo offline e receber actualizações sem apagar dados pessoais.
10. Percorrer tudo por teclado, fechar modal com Escape e devolver foco à vaga seleccionada.

## Passagem para o GitHub

Rever primeiro a integração local. O próximo acto externo proposto é enviar apenas
`codex/integracao-ai-studio` e abrir um PR para revisão, depois da aprovação explícita
do proprietário. Não há publicação, push, merge ou substituição da main autorizados
nesta preparação. O redesign pode avançar localmente em passos separados e continuar
a ser revisto antes de qualquer publicação.
