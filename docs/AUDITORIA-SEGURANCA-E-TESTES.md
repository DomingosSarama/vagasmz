# Revisão funcional e de segurança — VagasMZ

Data: 19 de Outubro de 2026. Âmbito: implementação local, branch `codex/integracao-ai-studio`. Não houve push, merge nem publicação. A main continua no commit inicial `b64ba5b`.

## Correcções entregues

- Favoritos: marcador inteiramente preenchido a verde, fundo do botão, etiqueta «Guardada» e contorno do cartão. Funciona nos temas claro e escuro, com `aria-pressed` para leitores de ecrã. Gravação protegida contra cliques concorrentes e mensagem de erro se o armazenamento falhar.
- Backups: validação dos campos e estruturas aninhadas, tipos, opções, datas reais, URLs públicos, limites de tamanho/listas e IDs duplicados. Chaves de manipulação de protótipos são rejeitadas; campos desconhecidos são descartados. A validação ocorre antes de qualquer alteração. O restauro usa uma transacção que repõe os dados anteriores se houver falha. O formato v2 inclui preferências, empresas e fontes; o v1 completo continua suportado.
- Catálogo: substituição numa transacção e validação dos anúncios recebidos. Exemplos conhecidos continuam classificados como demonstração mesmo que um ficheiro lhes atribua uma indicação de verificação. Não são produzidos alertas sobre exemplos fictícios. O conteúdo dos históricos fictícios antigos deixou de ser incluído no código entregue ao navegador; a migração usa apenas os seus IDs. Abrir uma empresa respeita a preferência de ocultar demonstrações.
- Importação manual: rejeição de objectos onde se esperava texto, opções inexistentes, datas impossíveis e endereços internos. Os campos desconhecidos ficam «Não informado», sem inventar Maputo, trabalho presencial ou experiência. IDs novos usam UUID.
- Pedidos externos: lista exacta de domínios HTTPS, sem credenciais nem portas alternativas; bloqueio de redireccionamentos; limites de tempo e de resposta de 2 MiB. Todos os endereços DNS devolvidos têm de ser públicos; a ligação usa o endereço já validado, mantendo a validação TLS para o nome original. Isto evita uma segunda resolução DNS entre a verificação e o pedido.
- Servidor: permanece ligado apenas a `127.0.0.1:3000`. Valida Host e Origin, rejeita pedidos de API de outras origens, limita frequência e aceita JSON com limite de 256 KiB. Erros devolvem mensagens genéricas, sem stack traces, caminhos locais ou conteúdo enviado. As respostas de API não são guardadas em cache.
- Produção: política de segurança de conteúdo, protecção contra interpretação de tipos incorrectos, referência externa desactivada e enquadramento limitado à mesma origem. Fontes TypeScript, documentação interna, `.env`, `.git`, manifests de dependências e source maps não são servidos. O modo de desenvolvimento limita o acesso do Vite à pasta do projecto.
- Prazos: uma vaga só expira depois de terminar a data indicada no fuso de Moçambique. Datas impossíveis deixam de ser interpretadas como dias válidos.
- Calendário: correcção do fim dos eventos de dia inteiro e bloqueio de injecção de novas linhas através de URLs. Entidades HTML inválidas não derrubam o processamento do feed.
- PDF: títulos, notas, contactos e entrevistas extensos passam a ser repartidos por linhas e páginas. Falhas de exportação mostram uma mensagem simples.
- Privacidade e interface: retiradas referências ao nome interno da base de dados e infra-estrutura de notificações. O rascunho de candidatura usa campos por completar quando faltam formação ou competências, e deixa de afirmar que BI e NUIT seguem anexados. Existe um ecrã de recuperação para erros de apresentação inesperados.

## Verificação executada

| Verificação | Resultado |
|---|---|
| Testes automáticos | **39 passaram; 0 falharam** |
| TypeScript, `npm run lint` | Sem erros; o comando faz verificação de tipos |
| Compilação de produção | Concluída; mantém um aviso de dimensão do bundle principal |
| `npm audit` | **0 vulnerabilidades conhecidas reportadas** nas dependências instaladas |
| Padrões de credenciais no código e ficheiros de produção | Nenhuma ocorrência nos 62 ficheiros de texto analisados; 0 ficheiros `.map` produzidos |
| Backups e armazenamento | Restauro completo, rejeição antes de escrita e rollback após falha simulada, com IndexedDB de teste |
| API real em portas locais de teste | JSON inválido, limites, dados malformados, origem/Host, frequência, respostas de erro e ficheiros privados |
| Pedidos a fontes | DNS privado, endereço fixado, redireccionamentos, respostas grandes e cancelamento por tempo limite, com transporte simulado |
| Lógica de negócio | Pesquisa/filtros, deduplicação, compatibilidade, RSS, metadados, datas, calendário, cartas e exclusão de exemplos nos alertas |
| PDF | Criação de documento válido com várias páginas para campos extensos; teste programático |
| Navegador | Guardar/remover, persistência após recarregar, ambos os temas, pesquisa por empresa, páginas principais, lista de favoritos e disposição a 390 px |

Na consulta real feita durante a revisão, os quatro fornecedores responderam: MMO (24), SoVagas (9), Remotive (8) e Jobicy (8), num total de 49 anúncios após processamento. Nenhum foi marcado como demonstração ou como verificado. Estes números mudam com as fontes e não confirmam que uma vaga está activa. Conteúdo recolhido exige confirmação na entidade anunciante; a área, competências e localização inferidas continuam a ser heurísticas.

## Limites e condições antes de uma publicação

Esta revisão e os 39 testes não demonstram ausência total de erros nem substituem uma auditoria independente de uma instalação pública. Os testes de transporte usam simulação, complementada pela consulta real aos feeds. O PDF foi verificado programaticamente; não foi feita uma revisão visual de todas as combinações de conteúdo. O ensaio móvel foi feito num viewport de 390 px, sem testar todos os modelos de telemóvel.

A aplicação actual guarda perfil, notas e candidaturas no navegador. Não há autenticação multiutilizador nem cifragem própria desses dados; outra pessoa com acesso ao mesmo perfil de navegador poderá vê-los. O backup JSON contém dados pessoais e deve ser guardado pelo utilizador num local seguro. Não se envia o perfil ou candidaturas aos feeds. Os formulários de importação enviam ao servidor local os dados do anúncio introduzidos pelo utilizador.

HTML, CSS e JavaScript entregues ao navegador podem sempre ser inspeccionados. Dados de programação não devem conter segredos; protecções de interface ou minificação não os tornam privados. Não foram encontradas credenciais activas na revisão, mas a pesquisa por padrões não cobre todos os formatos possíveis nem constitui análise completa de todo o histórico Git.

Antes de disponibilizar uma versão pública, é necessário definir alojamento HTTPS, domínios/origens autorizados e modelo de contas/permissões se houver armazenamento partilhado. A configuração actual bloqueia domínios públicos intencionalmente e não deve ser aberta indiscriminadamente. Os controlos de frequência são locais ao processo. A confirmação de validade e autoria de anúncios não é automática. O bundle principal continua grande, constituindo uma oportunidade de optimização que deve preservar o funcionamento offline.

## Referências técnicas

- [Express — boas práticas de segurança em produção](https://expressjs.com/en/advanced/best-practice-security/)
- [OWASP — prevenção de SSRF](https://cheatsheetseries.owasp.org/cheatsheets/Server_Side_Request_Forgery_Prevention_Cheat_Sheet.html)
- [Node.js — HTTPS e opções de ligação](https://nodejs.org/api/https.html#httpsrequesturl-options-callback)
- [Zod — validação de objectos](https://zod.dev/api?id=objects)
