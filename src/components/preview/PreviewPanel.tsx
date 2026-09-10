import { Monitor, MoreHorizontal, PanelRightOpen, Smartphone } from 'lucide-react'
import { Badge, IconButton, ScrollArea } from '../ui'
import styles from './PreviewPanel.module.css'

export type PreviewDevice = 'desktop' | 'mobile'

export interface PreviewPanelProps {
  device: PreviewDevice
  onDeviceChange: (device: PreviewDevice) => void
  syncEnabled: boolean
  settingsOpen: boolean
  onShowSettings: () => void
}

export function PreviewPanel({ device, onDeviceChange, syncEnabled, settingsOpen, onShowSettings }: PreviewPanelProps) {
  return (
    <section className={styles.panel} aria-label="公众号预览" data-device={device}>
      <header className={styles.header}>
        <div className={styles.previewTitle}><strong>预览</strong><Badge>双栏同步已{syncEnabled ? '开启' : '关闭'}</Badge></div>
        <div className={styles.deviceActions}>
          {!settingsOpen && <IconButton label="显示右侧边栏" onClick={onShowSettings}><PanelRightOpen size={16} /></IconButton>}
          <IconButton label="桌面预览" data-active={device === 'desktop'} onClick={() => onDeviceChange('desktop')}><Monitor size={16} /></IconButton>
          <IconButton label="手机预览" data-active={device === 'mobile'} onClick={() => onDeviceChange('mobile')}><Smartphone size={16} /></IconButton>
          <IconButton label="预览更多操作"><MoreHorizontal size={18} /></IconButton>
        </div>
      </header>
      <div className={styles.canvas}>
        <ScrollArea>
          <article className={styles.article}>
            <h1>在本地运行大语言模型：<br />Ollama 完全指南</h1>
            <p>Ollama 是一个简单易用的工具，让你可以在本地运行各种开源大语言模型。本文将从安装、使用到常见问题，带你快速上手。</p>
            <hr />
            <h2><span>1</span>什么是 Ollama？</h2>
            <p>Ollama 是一个开源的本地大模型运行工具，支持 Llama、Mistral、Gemma 等多种模型。它的特点是：</p>
            <ul><li>安装简单</li><li>使用方便</li><li>支持多种模型</li><li>运行在本地，保护隐私</li></ul>
            <hr />
            <h2><span>2</span>安装 Ollama</h2>
            <h3>2.1　下载安装</h3>
            <p>访问 <a href="https://ollama.com">Ollama 官网</a> 下载适合你系统的版本。</p>
            <pre><code>bash{`\n\n`}# macOS{`\n`}brew install ollama{`\n\n`}# Windows{`\n`}# 下载安装包并按照提示安装</code></pre>
          </article>
        </ScrollArea>
      </div>
    </section>
  )
}
