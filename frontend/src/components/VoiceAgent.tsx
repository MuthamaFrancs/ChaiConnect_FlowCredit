import { useCallback, useMemo, useRef, useState } from 'react'
import { useApp } from '../context/AppProvider'

type SRCtor = new () => SpeechRecognition

interface SpeechRecognition extends EventTarget {
  continuous: boolean
  interimResults: boolean
  lang: string
  start: () => void
  stop: () => void
  abort: () => void
  onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => void) | null
  onerror: ((this: SpeechRecognition, ev: Event) => void) | null
  onend: ((this: SpeechRecognition, ev: Event) => void) | null
}

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList
}

function getSpeechRecognition(): SRCtor | null {
  const w = window as Window &
    typeof globalThis & {
      SpeechRecognition?: SRCtor
      webkitSpeechRecognition?: SRCtor
    }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

export function VoiceAgent({ portal }: { portal?: boolean }) {
  const { t, lang, pendingFarmerDisbursements, farmerCreditScore } = useApp()
  const [open, setOpen] = useState(false)
  const [listening, setListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [reply, setReply] = useState('')
  const recRef = useRef<SpeechRecognition | null>(null)

  const supported = useMemo(() => typeof window !== 'undefined' && !!getSpeechRecognition(), [])

  const buildReply = useCallback(
    (raw: string) => {
      const lower = raw.toLowerCase()
      if (/disburs|money|mpesa|b2c|payment|pesa|malipo/.test(lower)) {
        return t(
          'Disbursements land as M-Pesa. The farmer confirms them in Wallet; each confirmation adds a ledger row and can lift the FlowCredit score.',
          'Malipo ya B2C yanaingia M-Pesa. Mkulima anathibitisha kwenye Wallet; kila uthibitishaji huongeza historia na alama ya mkopo.',
        )
      }
      if (/score|credit|ledger|mkopo|alama|historia/.test(lower)) {
        return t(
          `Their FlowCredit score is about ${farmerCreditScore}. Accepted receipts and steady inflows improve it; missed patterns reduce limits.`,
          `Alama ya mkopo ni karibu ${farmerCreditScore}. Malipo yanayothibitishwa na misingi thabiti huiboresha.`,
        )
      }
      if (/pending|accept|wallet|bei/.test(lower)) {
        const n = pendingFarmerDisbursements.length
        return t(
          n > 0
            ? `There ${n === 1 ? 'is' : 'are'} ${n} amount(s) waiting in Wallet for the farmer to accept.`
            : 'Nothing is waiting in Wallet right now after the last cycle.',
          n > 0
            ? `Kuna kiasi ${n} kinachosubiri Wallet kwa mkulima kuidhinisha.`
            : 'Hakuna kinachosubiri Wallet kwa sasa.',
        )
      }
      if (/hello|habari|^hi |help|saidia/.test(lower)) {
        return t(
          'Ask about disbursements, M-Pesa, Wallet accept, or credit scoring. I will answer in short plain language.',
          'Uliza kuhusu malipo, M-Pesa, Wallet, au alama ya mkopo.',
        )
      }
      return t(
        'Try saying: How do disbursements work? or What is the credit score?',
        'Jaribu: Malipo yanafanyaje? au Alama ya mkopo ni nini?',
      )
    },
    [farmerCreditScore, pendingFarmerDisbursements.length, t],
  )

  const speak = useCallback(
    (text: string) => {
      if (!window.speechSynthesis) return
      window.speechSynthesis.cancel()
      const u = new SpeechSynthesisUtterance(text)
      u.lang = lang === 'sw' ? 'sw-KE' : 'en-KE'
      window.speechSynthesis.speak(u)
    },
    [lang],
  )

  const stopListen = useCallback(() => {
    recRef.current?.stop()
    recRef.current = null
    setListening(false)
  }, [])

  const startListen = useCallback(() => {
    const Ctor = getSpeechRecognition()
    if (!Ctor) return
    stopListen()
    const rec = new Ctor()
    rec.continuous = false
    rec.interimResults = false
    rec.lang = lang === 'sw' ? 'sw-KE' : 'en-US'
    rec.onresult = (ev) => {
      const text = ev.results[0]?.[0]?.transcript?.trim() ?? ''
      setTranscript(text)
      const out = buildReply(text)
      setReply(out)
      speak(out)
      setListening(false)
    }
    rec.onerror = () => {
      setListening(false)
    }
    rec.onend = () => setListening(false)
    recRef.current = rec
    try {
      rec.start()
      setListening(true)
    } catch {
      setListening(false)
    }
  }, [buildReply, lang, speak, stopListen])

  const bottom = portal ? 72 : 24
  const right = 16

  return (
    <div
      style={{
        position: 'fixed',
        right,
        bottom,
        zIndex: 80,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        gap: 8,
        maxWidth: 'min(360px, calc(100vw - 32px))',
      }}
    >
      {open && (
        <div
          className="card-surface"
          style={{
            padding: 14,
            boxShadow: '0 12px 40px rgba(0,0,0,0.18)',
            border: '1px solid rgba(0,0,0,0.08)',
          }}
        >
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 14 }}>
            {t('Voice guide', 'Mwongozo wa sauti')}
          </div>
          <p style={{ margin: '8px 0 0', fontSize: 12, color: 'var(--muted)', lineHeight: 1.45 }}>
            {t(
              'Tap the mic and speak. Useful when an agent is with a farmer on one phone.',
              'Gusa maikrofoni na zungumza. Mwakilishi anaweza kusaidia mkulima kwa simu moja.',
            )}
          </p>
          {!supported && (
            <p style={{ margin: '8px 0 0', fontSize: 12, color: 'var(--amber-warn)' }}>
              {t('Speech recognition is not available in this browser.', 'Kivinjari hiki hakina utambuzi wa sauti.')}
            </p>
          )}
          <div style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button
              type="button"
              className={`btn ${listening ? 'btn-primary' : ''}`}
              disabled={!supported}
              onClick={() => (listening ? stopListen() : startListen())}
              aria-pressed={listening}
            >
              {listening ? 'Listening...' : t('Speak', 'Zungumza')}
            </button>
            {reply && (
              <button type="button" className="btn btn-ghost" onClick={() => speak(reply)}>
                {t('Replay reply', 'Rudia jibu')}
              </button>
            )}
          </div>
          {transcript && (
            <div style={{ marginTop: 10, fontSize: 12, color: 'var(--muted)' }}>
              <strong>{t('You', 'Wewe')}:</strong> {transcript}
            </div>
          )}
          {reply && (
            <div style={{ marginTop: 8, fontSize: 13, lineHeight: 1.45 }}>
              <strong style={{ color: 'var(--leaf)' }}>{t('Guide', 'Mwongozo')}:</strong> {reply}
            </div>
          )}
        </div>
      )}
      <button
        type="button"
        className="btn btn-primary"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        style={{
          width: 52,
          height: 52,
          borderRadius: 999,
          padding: 0,
          justifyContent: 'center',
          boxShadow: '0 6px 20px rgba(27, 67, 50, 0.35)',
        }}
        title={t('Voice mode', 'Hali ya sauti')}
      >
        <span style={{ fontSize: 20 }} aria-hidden>
          Mic
        </span>
      </button>
    </div>
  )
}
