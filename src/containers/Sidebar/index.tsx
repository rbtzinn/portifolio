import { useState } from 'react'
import {
  SwitchContainer,
  SwitchInput,
  SwitchSlider,
  SidebarContainer
} from './styles'
import Avatar from '../../components/Avatar'
import Paragrafo from '../../components/Paragrafo'
import Titulo from '../../components/Titulo'
import { Descricao } from './styles'

type Props = {
  trocaTema: () => void
}

const Sidebar = (props: Props) => {
  const [isChecked, setIsChecked] = useState(false)

  const handleChange = () => {
    setIsChecked((prev) => !prev)
    props.trocaTema()
  }

  return (
    <aside>
      <SidebarContainer>
        <Avatar />
        <Titulo fontSize={20}>Roberto Gabriel</Titulo>
        <Paragrafo tipo="secundario" fontSize={16}>
          rbtzinn
        </Paragrafo>
        <Descricao tipo="principal" fontSize={12}>
          Engenheiro front-end
        </Descricao>
        <SwitchContainer>
          <label>
            <SwitchInput
              type="checkbox"
              checked={isChecked}
              onChange={handleChange}
            />
            <SwitchSlider />
          </label>
        </SwitchContainer>
      </SidebarContainer>
    </aside>
  )
}

export default Sidebar
