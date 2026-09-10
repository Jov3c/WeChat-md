import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Button } from './components/ui'
import './styles/global.css'

function Bootstrap() {
  return <Button variant="primary">WeChat MD</Button>
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Bootstrap />
  </StrictMode>,
)
