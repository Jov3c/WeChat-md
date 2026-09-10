import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './app/App'
import { ComponentGallery } from './app/ComponentGallery'
import './styles/global.css'

const view = new URLSearchParams(window.location.search).get('view')

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {view === 'components' ? <ComponentGallery /> : <App />}
  </StrictMode>,
)
