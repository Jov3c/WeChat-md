import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './app/App'
import { ComponentGallery } from './app/ComponentGallery'
import { PlatformGate } from './platform/PlatformGate'
import { detectRuntime } from './platform/runtime'
import { createRuntimeServices } from './platform/services'
import './styles/global.css'

const view = new URLSearchParams(window.location.search).get('view')
const initializeServices = () => createRuntimeServices(detectRuntime())

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {view === 'components'
      ? <ComponentGallery />
      : <PlatformGate createServices={initializeServices}>
          {(services) => <App services={services} />}
        </PlatformGate>}
  </StrictMode>,
)
