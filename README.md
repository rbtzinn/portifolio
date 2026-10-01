# Roberto Miranda · Portfólio

Portfólio interativo em WebGL. Um único sistema de **60 mil partículas na GPU** (24 mil no celular) se transforma, conforme a rolagem, em uma escultura para cada parte da minha história:

| # | Capítulo | Forma |
|---|----------|-------|
| 00 | **Início** | Galáxia espiral que desvia do cursor. O clique solta uma onda de choque. |
| 01 | **Sobre** | O símbolo `</>` em 3D. |
| 02 | **Projetos** | Uma forma para cada projeto: **mapa 3D de Pernambuco** com os 185 municípios em colunas (Painel EMPETUR), celular emitindo ondas (Leitor RFID), diamante lapidado (LUXE Store), tela com play (StreamVibe) e pin sobre uma rota (App de Frotas). |
| 03 | **Experiência** | Dupla hélice com um nó brilhante para cada experiência. |
| 04 | **Stack** | Nó toroidal. |
| 05 | **Contato** | Um `@` gigante. |

## Componentes de interface

Inspirados em [Cult UI](https://www.cult-ui.com) e [Skiper UI](https://skiper-ui.com), recriados em TypeScript puro (sem React) em [`src/components.ts`](src/components.ts):

- **Janelas de navegador e celular** com capturas reais de cada projeto, tilt 3D e reflexo que seguem o cursor.
- **Terminal animado** que "roda" o projeto RFID e "instala" a stack.
- **Frase revelada palavra por palavra** na rolagem, entre a abertura e o Sobre.
- **Números em odômetro**, **dynamic island** com o capítulo atual e o aviso de e-mail copiado, **botão com feixe de luz** e **dock** de contatos com ampliação.

## Como funciona

- Todas as formas são nuvens de pontos geradas no carregamento: amostragem de superfícies (`MeshSurfaceSampler`), texto desenhado em canvas e o mapa de PE pré-processado a partir do GeoJSON dos municípios (`public/assets/pe.bin`, Int16).
- A transformação acontece inteira no **vertex shader**. Cada partícula interpola entre a forma atual e a próxima com atraso próprio e um redemoinho no meio do caminho. O mouse repele as partículas e o clique gera uma onda de choque.
- Bloom (UnrealBloomPass), rolagem suave com Lenis e encaixe por capítulo, links diretos (`/#contato`), navegação por teclado e som ambiente sintetizado com WebAudio.

## Desempenho

- Um único draw call para as partículas, sem texturas.
- Perfil leve no celular: menos partículas, sem bloom e DPR limitado.
- Qualidade adaptativa: se o FPS cair, o DPR baixa e o bloom é desligado. O HUD mostra o FPS ao vivo.
- Respeita `prefers-reduced-motion`. Sem WebGL, o conteúdo continua legível.

## Rodando

```bash
npm install
npm run dev      # desenvolvimento
npm run build    # produção em dist/
npm run preview  # testar o build
```

Deploy na Vercel com o preset Vite (`vercel.json`). O conteúdo fica em [`src/data.ts`](src/data.ts).
