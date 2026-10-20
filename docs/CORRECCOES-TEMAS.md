# Correcções dos temas e da navegação

Alterações locais a partir dos dois ecrãs enviados pelo utilizador em 19/10/2026.

- A cápsula sol/lua passou a ser um único interruptor acessível. Toda a área é
  clicável e pode ser accionada pelo teclado. Está também disponível em ecrãs pequenos.
- A preferência visual é aplicada imediatamente; não espera pela gravação no navegador.
  A sincronização inicial já não pode repor uma preferência antiga depois de uma mudança.
  O tema guardado é carregado antes da espera pelas fontes externas.
- O fundo ocupa toda a área do destaque, incluindo o espaço atrás do título.
  O recorte deixou de começar a 14% da largura. O posicionamento é comum às duas imagens.
- O modo claro utiliza `public/images/maputo-afternoon.png`, com texto verde escuro,
  pesquisa clara e uma máscara suave que protege a leitura. O modo escuro conserva
  `public/images/maputo-night.png`, com título branco/verde e máscara escura.
- No menu lateral existe uma entrada para Candidaturas e uma para Alertas.
  A minha conta conserva Perfil e Vagas Guardadas, sem duplicar as outras páginas.

## Origem da imagem de tarde

Ficheiro: [`public/images/maputo-afternoon.png`](../public/images/maputo-afternoon.png).
Imagem ilustrativa editada com a ferramenta integrada de geração de imagens,
usando o fundo nocturno como referência para conservar a composição. O fundo
nocturno original foi preservado. Não é uma fotografia documental.

Prompt utilizado:

> Use case: lighting-weather. Edit target: attached existing panoramic illustration of the Maputo–Katembe bridge and Maputo waterfront at night. Change ONLY the lighting, sky and time of day to a bright, beautiful sunny late afternoon. Preserve the EXACT camera angle, bridge towers and cables, building positions, shoreline, foreground trees, perspective, panoramic 3:1 crop and composition. Warm afternoon sunlight, pale blue sky with subtle warm haze, naturally blue/turquoise water with delicate golden sun reflections, sunlit city buildings, green foreground foliage. Clear readable details, elegant restrained photorealistic appearance for a light-themed website. The left quarter should be open pale sky and subtle low contrast water/shoreline, suitable for dark text on top with a light CSS overlay. Do not add new buildings, do not change the bridge, do not add text, letters, logos, interface or a border.

## Validação

Verificação TypeScript, 15 testes de lógica/persistência/segurança e compilação
de produção aprovados. No navegador foram confirmados o clique no interruptor,
o estado claro/escuro, a persistência após recarregar e a ausência das duas entradas
duplicadas. Os ecrãs dos dois temas foram inspeccionados para confirmar o contraste.

As alterações permanecem na branch local. Não houve push, merge ou publicação.
