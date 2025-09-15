import styled from 'styled-components'

export const Card = styled.div`
  border: 1px solid ${(props) => props.theme.corDaBorda};
  padding: 16px;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
`

export const ContainerBotoes = styled.div`
  /* Container para alinhar os botões */
`

export const LinkBotao = styled.a`
  color: ${(props) => props.theme.corDeFundo};
  font-size: 14px;
  background-color: ${(props) => props.theme.corDeFundoBotao};
  text-decoration: none;
  padding: 8px;
  display: inline-block;
  margin-right: 8px; /* Espaço entre os botões */
`

export const BotaoLeiaMais = styled.button`
  color: ${(props) => props.theme.corDeFundoBotao};
  font-size: 14px;
  background-color: ${(props) => props.theme.corDeFundo};
  border: 1px solid ${(props) => props.theme.corDeFundoBotao};
  text-decoration: none;
  padding: 8px;
  display: inline-block;
  cursor: pointer;
`