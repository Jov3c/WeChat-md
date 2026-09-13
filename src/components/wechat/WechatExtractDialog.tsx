import { useEffect, useMemo, useState } from 'react'
import { CheckCircle2, ExternalLink, LoaderCircle, RotateCcw, Sparkles } from 'lucide-react'
import { Button, Checkbox, Dialog, Input } from '../ui'
import {
  extractWechatArticle,
  normalizeWechatArticleUrl,
  type ExtractedWechatArticle,
} from '../../features/wechat/wechatExtraction'
import type { StyleValuePath } from '../../features/styles/stylePresets'
import styles from './WechatExtractDialog.module.css'

export type WechatArticleSavePolicy = 'ask' | 'always' | 'never'

export interface WechatExtractDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  extractor?: (url: string) => Promise<ExtractedWechatArticle>
  savePolicy: WechatArticleSavePolicy
  onApply: (result: ExtractedWechatArticle, selectedPaths: StyleValuePath[]) => void
  onMerge?: (result: ExtractedWechatArticle, selectedPaths: StyleValuePath[]) => void
  onSaveStyle: (result: ExtractedWechatArticle, selectedPaths: StyleValuePath[], name: string) => void
  onSaveArticle: (result: ExtractedWechatArticle) => void | Promise<void>
  onSavePolicyChange: (policy: WechatArticleSavePolicy) => void
}

type Step = 'input' | 'save-article' | 'result'

export function WechatExtractDialog({
  open,
  onOpenChange,
  extractor = extractWechatArticle,
  savePolicy,
  onApply,
  onMerge,
  onSaveStyle,
  onSaveArticle,
  onSavePolicyChange,
}: WechatExtractDialogProps) {
  const [url, setUrl] = useState('')
  const [step, setStep] = useState<Step>('input')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<ExtractedWechatArticle>()
  const [selected, setSelected] = useState<StyleValuePath[]>([])
  const [rememberChoice, setRememberChoice] = useState(false)
  const [savingStyle, setSavingStyle] = useState(false)
  const [styleName, setStyleName] = useState('')

  useEffect(() => {
    if (!open) return
    setStep('input')
    setBusy(false)
    setError('')
    setResult(undefined)
    setSelected([])
    setRememberChoice(false)
    setSavingStyle(false)
    setStyleName('')
  }, [open])

  const allSelected = useMemo(
    () => Boolean(result?.tokens.length) && selected.length === result?.tokens.length,
    [result, selected],
  )

  const startExtraction = async () => {
    setError('')
    let normalized: string
    try { normalized = normalizeWechatArticleUrl(url) } catch (reason) {
      setError(reason instanceof Error ? reason.message : '请检查公众号文章链接')
      return
    }
    setBusy(true)
    try {
      const next = await extractor(normalized)
      setResult(next)
      setSelected(next.tokens.map((token) => token.path))
      setStyleName(`${next.title} · 提取风格`)
      if (savePolicy === 'always') await onSaveArticle(next)
      setStep(savePolicy === 'ask' ? 'save-article' : 'result')
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '提取失败，请稍后重试')
    } finally {
      setBusy(false)
    }
  }

  const chooseArticleSave = async (save: boolean) => {
    if (!result) return
    setBusy(true)
    try {
      if (save) await onSaveArticle(result)
      if (rememberChoice) onSavePolicyChange(save ? 'always' : 'never')
      setStep('result')
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '文章保存失败')
    } finally {
      setBusy(false)
    }
  }

  const finish = (action: 'apply' | 'merge') => {
    if (!result || selected.length === 0) return
    if (action === 'merge') (onMerge ?? onApply)(result, selected)
    else onApply(result, selected)
    onOpenChange(false)
  }

  const saveStyle = () => {
    if (!result || !styleName.trim() || selected.length === 0) return
    onSaveStyle(result, selected, styleName.trim())
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title="提取公众号排版" contentClassName={styles.dialog}>
      <div className={styles.body} data-step={step}>
        {step === 'input' ? (
          <div className={styles.inputStep}>
            <div className={styles.intro}><Sparkles size={18} /><div><strong>从一篇文章开始</strong><p>读取文章内容与排版，完成后由你决定应用或保存哪些样式。</p></div></div>
            <label className={styles.field}>
              <span>公众号文章链接</span>
              <Input aria-label="公众号文章链接" placeholder="https://mp.weixin.qq.com/s/..." value={url} disabled={busy} onChange={(event) => setUrl(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !busy) void startExtraction() }} />
            </label>
            {error ? <div className={styles.error} role="alert"><span>{error}</span><button type="button" onClick={() => setError('')}>知道了</button></div> : null}
            <p className={styles.privacy}>仅请求公开文章；提取结果不会自动修改当前内容。</p>
            <div className={styles.actions}><Button onClick={() => onOpenChange(false)}>取消</Button><Button variant="primary" disabled={busy || !url.trim()} onClick={() => void startExtraction()}>{busy ? <><LoaderCircle className={styles.spinner} size={15} /> 正在分析…</> : '开始提取'}</Button></div>
          </div>
        ) : null}

        {step === 'save-article' && result ? (
          <div className={styles.saveQuestion}>
            <span className={styles.successIcon}><CheckCircle2 size={20} /></span>
            <div><h3>要保存这篇文章吗？</h3><p>排版风格已经提取完成。你也可以把文章内容一起保存到本地，方便之后查看和编辑。</p></div>
            <label className={styles.checkRow}><Checkbox checked={rememberChoice} onCheckedChange={setRememberChoice} label="记住我的选择" /><span>记住我的选择，以后不再询问</span></label>
            {error ? <div className={styles.error} role="alert"><span>{error}</span></div> : null}
            <div className={styles.actions}><Button disabled={busy} onClick={() => { void chooseArticleSave(false) }}>不保存</Button><Button variant="primary" disabled={busy} onClick={() => { void chooseArticleSave(true) }}>{busy ? '正在保存图片…' : '保存文章'}</Button></div>
          </div>
        ) : null}

        {step === 'result' && result ? (
          <div className={styles.resultStep}>
            <div className={styles.articleSummary}>
              <span className={styles.articleMark}>文</span>
              <div><strong>{result.title}</strong><p>{result.author} · 已识别 {result.tokens.length} 项样式</p></div>
              <a href={result.sourceUrl} target="_blank" rel="noreferrer" aria-label="打开原文"><ExternalLink size={15} /></a>
            </div>
            <section className={styles.resultSection}>
              <div className={styles.sectionHeader}><div><strong>可应用样式</strong><span>取消不需要的项目</span></div><button type="button" onClick={() => setSelected(allSelected ? [] : result.tokens.map((token) => token.path))}>{allSelected ? '取消全选' : '全部选择'}</button></div>
              <div className={styles.tokenGrid}>
                {result.tokens.map((token) => {
                  const checked = selected.includes(token.path)
                  return <label className={styles.token} data-checked={checked} key={token.path}>
                    <Checkbox checked={checked} onCheckedChange={(next) => setSelected((current) => next ? [...current, token.path] : current.filter((path) => path !== token.path))} label={`应用 ${token.label}`} />
                    {token.swatch ? <i style={{ background: token.swatch }} /> : null}<span><small>{token.label}</small><strong>{token.displayValue}</strong></span>
                  </label>
                })}
                {result.tokens.length === 0 ? <p className={styles.empty}>没有识别到可安全应用的基础样式，仍可保存文章内容。</p> : null}
              </div>
            </section>
            <section className={styles.resultSection}>
              <div className={styles.sectionHeader}><div><strong>识别到的组件</strong><span>复杂结构会保留在原始预览中</span></div></div>
              <div className={styles.componentList}>{result.components.map((component) => <span key={component.kind}>{component.label} · {component.count} 处</span>)}{result.components.length === 0 ? <span>正文段落</span> : null}</div>
            </section>
            {savingStyle ? <div className={styles.saveStyleRow}><Input aria-label="新风格名称" value={styleName} onChange={(event) => setStyleName(event.target.value)} /><Button variant="primary" disabled={!styleName.trim() || selected.length === 0} onClick={saveStyle}>保存并应用</Button><Button onClick={() => setSavingStyle(false)}>取消</Button></div> : null}
            <div className={styles.resultActions}>
              <Button onClick={() => { setStep('input'); setResult(undefined); setError('') }}><RotateCcw size={14} /> 换一篇</Button>
              <span />
              <Button onClick={() => setSavingStyle(true)}>保存为新风格</Button>
              <Button disabled={selected.length === 0} onClick={() => finish('merge')}>合并到当前风格</Button>
              <Button variant="primary" disabled={selected.length === 0} onClick={() => finish('apply')}>{allSelected ? '应用整套风格' : '应用所选样式'}</Button>
            </div>
          </div>
        ) : null}
      </div>
    </Dialog>
  )
}
