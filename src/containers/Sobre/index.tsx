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
      proativo, analítico e comprometido com a construção de soluções web
      eficientes, responsivas e bem estruturadas. Em constante evolução técnica,
      busca aplicar boas práticas de desenvolvimento front-end, com foco em
      usabilidade, performance e organização de código. Está sempre alimentando
      seu portfólio com projetos relevantes, reforçando seu aprendizado prático
      e demonstrando evolução contínua. Demonstra facilidade de aprendizado,
      interesse por novas tecnologias e dedicação ao aprimoramento constante de
      suas habilidades.
    </Paragrafo>
    <GithubSecao>
      <img src="https://github-readme-stats.vercel.app/api?username=rbtzinn&show_icons=true&theme=dracula&include_all_commits=true&count_private=true" />
      <img src="https://github-readme-stats.vercel.app/api/top-langs/?username=rbtzinn&layout=compact&langs_count=7&theme=dracula" />
    </GithubSecao>
  </section>
)

export default Sobre
