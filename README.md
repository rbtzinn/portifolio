# Porto de Sinais · Roberto Miranda

Portfólio pessoal em 3D feito com Three.js. É uma travessia noturna de câmera por um porto digital no litoral de Pernambuco:

| # | Capítulo | O que acontece |
|---|----------|----------------|
| 00 | **Chegada** | O nome em tipografia gigante sobre o mar e, na ponta do píer, um retrato 3D real do Roberto. É a própria foto, recortada por IA e com relevo reconstruído. Gira com o mouse, é escaneado no clique e se dissolve em partículas ao rolar. |
| 01 | **Credencial** | Um crachá 3D com foto, pendurado num cordão. Dá para arrastar e girar, e um clique vira para o verso (formação). |
| 02 | **Pátio de cargas** | Cada projeto é um contêiner. O pórtico ergue um por vez conforme a rolagem, e o cursor vira um leitor RFID que lê a tag e abre o manifesto de carga. |
| 03 | **Diário de bordo** | As experiências viram boias que acendem ao longo de uma rota sobre a água. |
| 04 | **Carga declarada** | A stack técnica vista de cima, sobre o pátio. |
| 05 | **Farol** | O farol se vira para o visitante: é o contato (e-mail, WhatsApp, LinkedIn, GitHub, CV). |

## Stack

- **Vite + TypeScript** (sem framework de UI)
- **Three.js** com shaders próprios: água com reflexos das luminárias e da lua, céu, feixe volumétrico do farol, partículas
- **Lenis** para a rolagem suave, com encaixe em cada capítulo
- Som ambiente sintetizado com WebAudio, sem arquivos de áudio

## Retrato 3D

Os arquivos `public/assets/roberto-cutout.webp` e `roberto-depth.png` foram gerados a partir da foto com MediaPipe. O Image Segmenter recorta a pessoa do fundo e o Face Landmarker extrai os 478 pontos 3D do rosto. O mapa de profundidade combina a silhueta "inflada" com o relevo real do rosto, e o shader desloca uma malha com ele e reilumina a foto com as luzes da cena.

## Desempenho

- Perfis de qualidade: no celular, sem bloom, com menos geometria e DPR limitado.
- Qualidade adaptativa: se o FPS cair, o DPR baixa e o bloom é desligado.
- Contêineres, rochas e postes usam `InstancedMesh`, e todos os brilhos são desenhados numa única chamada.
- Luz de sódio pré-calculada numa textura do piso, sem dezenas de luzes dinâmicas.
- Respeita `prefers-reduced-motion`. Se não houver WebGL, o conteúdo continua legível.

## Rodando

```bash
npm install
npm run dev      # desenvolvimento
npm run build    # build de produção em dist/
npm run preview  # testar o build
```

## Deploy na Vercel

Importe o repositório na Vercel. O preset **Vite** é detectado automaticamente (build `npm run build`, saída `dist/`), e a configuração fica em `vercel.json`.

## Editando o conteúdo

Todo o conteúdo (projetos, experiências, stack, contatos) está em [`src/data.ts`](src/data.ts). A foto fica em `public/assets/foto.jpg` e o currículo em `public/assets/cv.pdf`.
