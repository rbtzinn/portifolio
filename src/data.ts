export const PROFILE = {
  name: 'Roberto Miranda',
  fullName: 'Roberto Gabriel Araújo Miranda',
  role: 'Desenvolvedor Frontend',
  city: 'Recife · PE',
  email: 'rbtgabriel04@gmail.com',
  phone: '(81) 98331-2369',
  whatsapp: 'https://wa.me/5581983312369',
  github: 'https://github.com/rbtzinn',
  linkedin: 'https://www.linkedin.com/in/roberto-gabriel-ara%C3%BAjo-miranda/',
  cv: '/assets/cv.pdf'
}

export type Project = {
  code: string
  name: string
  short: string
  kind: string
  year: string
  summary: string
  bullets: string[]
  stack: string[]
  link: string
  linkLabel: string
  color: string
  accent: string
}

// Cada projeto é um contêiner no pátio. `code` segue o formato ISO 6346.
export const PROJECTS: Project[] = [
  {
    code: 'RBTU 260101 7',
    name: 'Painel de Contratações Artísticas',
    short: 'EMPETUR',
    kind: 'EMPETUR · Governo de PE',
    year: 'Jan 2026',
    summary:
      'Painel analítico no portal de Transparência da EMPETUR para qualquer cidadão consultar as contratações artísticas em Pernambuco.',
    bullets: [
      'KPIs, filtros combinados, tabelas exportáveis e mapa de calor de PE com foco e zoom por município.',
      'Pipeline no navegador que normaliza artistas e municípios, remove duplicidades e trata bases governamentais inconsistentes.',
      'Dados de Google Sheets em CSV com cache em memória, exportação em CSV, Excel e PDF, acessibilidade e i18n.'
    ],
    stack: ['React', 'Vite', 'Tailwind', 'Tremor', 'D3-geo', 'React Simple Maps', 'PapaParse'],
    link: 'https://empetur-painel.vercel.app/',
    linkLabel: 'Ver ao vivo',
    color: '#e8672a',
    accent: '#ffb38a'
  },
  {
    code: 'RBTU 250602 3',
    name: 'Leitor RFID · Novo Atacarejo',
    short: 'RFID',
    kind: 'Em produção · Varejo',
    year: 'Jun 2025',
    summary:
      'App Android de inventário RFID em tempo real, em uso no Novo Atacarejo, que reduziu bastante o tempo de inventário.',
    bullets: [
      'Leitura de tags RFID em tempo real com atualização automática por setor.',
      'Backend que transforma planilhas de patrimônio num banco estruturado para inventários rápidos.',
      'Sincronização com CSV, SQLite local e exportação de relatórios.'
    ],
    stack: ['Android', 'Java', 'Kotlin', 'RFID', 'SQLite', 'CSV'],
    link: 'https://github.com/rbtzinn/RFID-NovoAtacarejo',
    linkLabel: 'Ver no GitHub',
    color: '#138f8a',
    accent: '#7ff3e6'
  },
  {
    code: 'RBTU 260403 9',
    name: 'LUXE Store',
    short: 'LUXE',
    kind: 'E-commerce Platform',
    year: 'Abr 2026',
    summary:
      'E-commerce premium com catálogo dinâmico, carrinho e wishlist persistentes, i18n PT-BR/EN e um painel admin completo.',
    bullets: [
      'Catálogo via DummyJSON API, scroll reset por rota e estado global com Zustand.',
      'Admin com produtos, pedidos, categorias, cupons, banners, avaliações e clientes.',
      'UI com Tailwind e shadcn/ui, responsiva de ponta a ponta.'
    ],
    stack: ['React', 'TypeScript', 'Tailwind', 'shadcn/ui', 'Zustand', 'i18n'],
    link: 'https://luxestore-eight.vercel.app/',
    linkLabel: 'Ver ao vivo',
    color: '#1b1b1f',
    accent: '#e9c46a'
  },
  {
    code: 'RBTU 260404 5',
    name: 'StreamVibe',
    short: 'StreamVibe',
    kind: 'Plataforma de Streaming',
    year: 'Abr 2026',
    summary:
      'Uma plataforma no estilo Netflix, com hero dinâmico, carrosséis por gênero, busca e favoritos, alimentada pela TMDB API em tempo real.',
    bullets: [
      'Hero banner dinâmico, carrosséis por gênero e página de detalhes.',
      'Busca, favoritos persistentes e skeleton loaders.',
      'Dark mode cinematográfico e design responsivo.'
    ],
    stack: ['React', 'TypeScript', 'Tailwind', 'TMDB API', 'Vite'],
    link: 'https://films-port.vercel.app/',
    linkLabel: 'Ver ao vivo',
    color: '#b3202c',
    accent: '#ff8d95'
  },
  {
    code: 'RBTU 260105 1',
    name: 'App de Frotas',
    short: 'Frotas',
    kind: 'Mobile · Flutter',
    year: 'Jan 2026',
    summary:
      'App mobile de controle de frotas com assinatura digital em canvas, modo offline e sincronização automática.',
    bullets: [
      'Assinatura digital desenhada em canvas.',
      'Modo offline com sync automático para Google Sheets via Apps Script.',
      'Material 3 e componentes reutilizáveis.'
    ],
    stack: ['Flutter', 'Dart', 'Material 3', 'Apps Script'],
    link: 'https://frotasapp.vercel.app/',
    linkLabel: 'Ver ao vivo',
    color: '#2156c9',
    accent: '#9dbcff'
  }
]

export type LogEntry = {
  when: string
  role: string
  org: string
  note: string
}

export const LOGBOOK: LogEntry[] = [
  {
    when: '2026 → hoje',
    role: 'Gestor Técnico · Compliance (TI & IA)',
    org: 'Administração de Suape',
    note: 'Uso TI e IA para automatizar controles internos e mapear processos no Complexo Industrial Portuário de Suape.'
  },
  {
    when: '2025 → hoje',
    role: 'Desenvolvedor Frontend Jr.',
    org: 'EMPETUR · Turismo de Pernambuco',
    note: 'Painel de transparência pública com KPIs, mapa interativo de PE e tratamento de bases governamentais.'
  },
  {
    when: '2022 → 2024',
    role: 'Freelance Full Stack',
    org: 'Smartracker Tecnologias',
    note: 'App RFID Android em produção, com backend e entrega de ponta a ponta direto com o cliente.'
  },
  {
    when: '2022 → 2025',
    role: 'Suporte de TI · Apoio Administrativo',
    org: 'Controladoria Geral do Estado · PE',
    note: 'Chamados do início ao fim, inventário de equipamentos, documentação técnica e rotinas de um órgão público.'
  }
]

export const STACK: { group: string; items: string[] }[] = [
  { group: 'Frontend', items: ['React', 'Next.js', 'TypeScript', 'JavaScript', 'Tailwind', 'Sass', 'Figma'] },
  { group: 'Mobile', items: ['Flutter', 'Dart', 'React Native', 'Kotlin', 'Java Android'] },
  { group: 'Backend & BD', items: ['Node.js', 'Express', 'PostgreSQL', 'MySQL', 'SQLite'] },
  { group: 'DevOps', items: ['Git', 'GitHub', 'Docker', 'AWS'] },
  { group: 'Dados & outros', items: ['D3.js', 'Zustand', 'TanStack Query', 'PapaParse', 'Python'] }
]

export const EDUCATION = [
  { what: 'Ciência da Computação', where: 'UNINASSAU · 2022–2025' },
  { what: 'Engenheiro Front-end', where: 'EBAC · 2023–2025' },
  { what: 'Análise e Desenv. de Sistemas', where: 'GranFaculdade · 2025–2026' }
]
