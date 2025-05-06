import Titulo from '../../components/Titulo'
import Paragrafo from '../../components/Paragrafo'
import { GithubSecao } from './styles'

const Sobre = () => (
  <section>
    <Titulo fontSize={16}>Sobre mim</Titulo>
    <Paragrafo tipo="principal">
      Engenheiro Front-End em formação pela EBAC – Escola Britânica de Artes
      Criativas e Tecnologia, graduando em Ciência da Computação pela
      UNINASSAU-Recife, com inglês intermediário. Profissional com perfil
      proativo e analítico. Participei do desenvolvimento de um site
      institucional para a ETE Chico Science, aplicando princípios de design
      responsivo e boas práticas de UI/UX. Além disso, elaborei o front-end de
      um e-commerce de calçados, utilizando display grid e estilização
      sofisticada, e desenvolvi um protótipo de chat interativo, com barra de
      pesquisa para contatos e sistema de upload/download de arquivos.
      Atualmente, aprimoro minhas habilidades em desenvolvimento de interfaces e
      interatividade web, buscando sempre criar aplicações eficientes e
      visualmente atraentes.
    </Paragrafo>
    <GithubSecao>
      <img src="https://github-readme-stats.vercel.app/api?username=rbtzinn&show_icons=true&theme=dracula&include_all_commits=true&count_private=true" />
      <img src="https://github-readme-stats.vercel.app/api/top-langs/?username=rbtzinn&layout=compact&langs_count=7&theme=dracula" />
    </GithubSecao>
  </section>
)

export default Sobre
