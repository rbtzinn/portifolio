import styled from 'styled-components'

export const Lista = styled.ul`
  display: grid;
  grid-template-columns: 1fr 1fr;
  column-gap: 60px;
  row-gap: 60px; 
  align-items: stretch;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    column-gap: 0;
    /* ANTES: row-gap: 16px; */
    row-gap: 40px; /* Aumentei também para a versão mobile */
  }
`