import Paragrafo from '../Paragrafo'
import Titulo from '../Titulo'

import { Card, LinkBotao } from './styles'

type ProjetoProps = {
  nome: string
  descricao: string
  ferramentas:string
  link: string
}

const Projeto = ({ nome, descricao, link, ferramentas }: ProjetoProps) => (
  <Card>
    <Titulo>{nome}</Titulo>
    <Paragrafo tipo="secundario">{descricao}</Paragrafo>
    <Paragrafo tipo='principal'>{ferramentas}</Paragrafo>
    <LinkBotao href={link}>Visualizar</LinkBotao>
  </Card>
)

export default Projeto
