import Titulo from '../../components/Titulo'
import Paragrafo from '../../components/Paragrafo'
import { GithubSecao } from './styles'

const Sobre = () => (
  <section>
    <Titulo fontSize={16}>Sobre mim</Titulo>
    <Paragrafo tipo="principal">
      Sou um Engenheiro Front-End graduado em Ciência da Computação pela UNINASSAU-Recife e com especialização pela EBAC. Minha paixão é transformar ideias em soluções web que sejam ao mesmo tempo eficientes, responsivas e bem estruturadas.

Com um perfil proativo e analítico, foco em aplicar boas práticas de desenvolvimento para garantir usabilidade, performance e um código sempre organizado. Estou em constante evolução, alimentando meu portfólio com projetos que refletem meu aprendizado prático e minha dedicação em dominar novas tecnologias.
    </Paragrafo>
    <GithubSecao>
      <img src="https://github-readme-stats.vercel.app/api?username=rbtzinn&show_icons=true&theme=dracula&include_all_commits=true&count_private=true" />
      <img src="https://github-readme-stats.vercel.app/api/top-langs/?username=rbtzinn&layout=compact&langs_count=7&theme=dracula" />
    </GithubSecao>
  </section>
)

export default Sobre
