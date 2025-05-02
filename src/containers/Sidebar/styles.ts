import styled from 'styled-components'
import { P } from '../../components/Paragrafo/styles'

export const SwitchSlider = styled.span`
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: ${(props) => props.theme.corPrincipal};
  transition: 0.4s;
  border-radius: 34px;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);

  &:before {
    position: absolute;
    content: "";
    height: 22px;
    width: 22px;
    left: 4px;
    bottom: 4px;
    background-color: ${(props) => props.theme.corDeFundo};
    transition: 0.4s;
    border-radius: 50%;
  }
`

export const SwitchInput = styled.input`
  opacity: 0; // O checkbox é invisível
  width: 0;
  height: 0;
  position: absolute;
  left: 0;
  top: 0;

  &:checked + ${SwitchSlider} {
    background-color: ${(props) => props.theme.corPrincipal};
  }

  &:checked + ${SwitchSlider}:before {
    transform: translateX(30px); // Move o círculo do switch
    background: ${(props) => props.theme.corDeFundo};
  }
`

export const SwitchContainer = styled.div`
  position: relative;
  display: inline-block;
  width: 60px;
  height: 30px;
  margin-top: 20px;
`

export const Descricao = styled(P)`
  margin-top: 24px;
  margin-bottom: 40px;
`

export const SidebarContainer = styled.div`
  position: sticky;
  top: 80px;
  left: 0;

  @media (max-width: 768px) {
    margin-bottom: 40px;
    text-align: center;
  }
`
