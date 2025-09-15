import { useState } from 'react'
import Paragrafo from '../Paragrafo'
import Titulo from '../Titulo'

import { Card, LinkBotao, BotaoLeiaMais, ContainerBotoes } from './styles'

type ProjetoProps = {
  nome: string
  descricao: string
  ferramentas: string
  link: string
}

const Projeto = ({ nome, descricao, link, ferramentas }: ProjetoProps) => {
  const [estaExpandido, setEstaExpandido] = useState(false)

  const limiteCaracteres = 250
  const textoCurto =
    descricao.length > limiteCaracteres
      ? descricao.slice(0, limiteCaracteres) + '...'
      : descricao

  return (
    <Card>
      <div>
        <Titulo>{nome}</Titulo>
        <Paragrafo tipo="principal">{ferramentas}</Paragrafo>
        <Paragrafo tipo="secundario">
          {estaExpandido ? descricao : textoCurto}
        </Paragrafo>
      </div>
      <ContainerBotoes>
        <LinkBotao href={link} target="_blank" rel="noopener noreferrer">
          Visualizar
        </LinkBotao>

        {descricao.length > limiteCaracteres && (
          <BotaoLeiaMais onClick={() => setEstaExpandido(!estaExpandido)}>
            {estaExpandido ? 'Ver menos' : 'Leia mais'}
          </BotaoLeiaMais>
        )}
      </ContainerBotoes>
    </Card>
  )
}

export default Projeto