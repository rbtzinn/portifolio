// Componente Projetos (Projetos.tsx)

import Projeto from '../../components/Projeto'
import Titulo from '../../components/Titulo'

import { Lista } from './styles'

const projetos = [
  {
    nome: 'Projeto Random Teams',
    descricao:
      'Um projeto que foi feito para randomizar times para jogos de futebol ou outros esportes, com o diferencial de adicionar o nível do jogador para balancear os times.',
    ferramentas: 'React/TypeScript/Bootstrap/Sass ',
    link: 'https://random-teams-one.vercel.app'
  },
  {
    nome: 'Projeto Clone GGmax',
    descricao:
      'Um Projeto baseado na GGMAX, um site de vendas de jogos ou produtos para jogos com uma integração backend e resposividade para varios tipos de telas.',
    ferramentas: 'React/TypeScript/Sass ',
    link: 'https://clone-ggmax-deju.vercel.app'
  },
  {
    nome: 'Projeto E-commerce',
    descricao:
      'Loja virtual com base no design do site do mercado livre com responsividade e funcionalidades de carrinho bem didático, carousel, listagem de produtos, cálculo de frete com CEP entre outras coisas. ',
    ferramentas: 'React + Vite/JavaScript/CSS ',
    link: 'https://ycommerce-taupe.vercel.app'
  },
  {
    nome: 'Projeto de Minhas Tarefas',
    descricao:
      'Projeto com botoes de adicionar tarefas, ver as pendentes ou finalizadas, conseguir "riscar" as tarefas já feitas.',
    ferramentas: 'VueJS/JavaScript/HTML',
    link: 'https://todo-vue-zeta-six.vercel.app'
  },
  {
    nome: 'Projeto E-commerce responsivo',
    descricao:
      ' E-commerce fictício com foco em design responsivo e interatividade do usuário. Inclui funcionalidades como sistema de login/logout básico e zoom em produtos para visualização detalhada.  Recursos como carrossel de destaques, navbar responsiva e layout otimizado para diferentes dispositivos foram implementados, com ênfase na experiência do usuário.  Projeto em evolução, com potencial para melhorias e novas funcionalidades.',
    ferramentas: 'JavaScript/Bootstrap(Avançado)',
    link: 'https://ecommerce-xi-ten-83.vercel.app/index.html#'
  },
  {
    nome: 'Projeto Clone Disney+',
    descricao:
      ' Projeto feito para praticar e adicionar ao portfólio com intuito de alimentar também o github. Usando boas práticas de CSS – Block Element Modifier (BEM) Projeto em evolução, com potencial para melhorias até mesmo adições de APIs e novas funcionalidades.',
    ferramentas: 'Gulp/Java Script/Sass',
    link: 'https://clone-disneyplus-one-pi.vercel.app/'
  }
]

const Projetos = () => (
  <section>
    <Titulo fontSize={16}>Projetos</Titulo>
    <Lista>
      {projetos.map((projeto, index) => (
        <li key={index}>
          <Projeto
            nome={projeto.nome}
            descricao={projeto.descricao}
            ferramentas={projeto.ferramentas}
            link={projeto.link}
          />
        </li>
      ))}
    </Lista>
  </section>
)

export default Projetos
