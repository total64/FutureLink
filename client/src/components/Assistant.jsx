import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth'
import { api } from '../lib/api'

const starters = {
  SEEKER: ['Where are internships held?', 'How do I build my portfolio?', 'How do I apply?'],
  PROVIDER: ['How do I publish an event?', 'How do I accept an applicant?', 'Where can I set the venue?'],
  ADMIN: ['How do I approve an organization?', 'How do payments get confirmed?'],
  GUEST: ['Where are events held?', 'How does a student join?', 'How does an organization publish?'],
}

export default function Assistant() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const role = user?.role || 'GUEST'
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [messages, setMessages] = useState([])

  async function ask(value) {
    const message = value.trim()
    if (!message || busy) return
    const history = messages.slice(-6).map((item) => ({ role: item.role, content: item.content }))
    setMessages((current) => [...current, { role: 'user', content: message }])
    setText('')
    setBusy(true)
    try {
      const result = await api('/assistant', { method: 'POST', body: { message, history } })
      setMessages((current) => [...current, { role: 'assistant', content: result.reply, links: result.links || [] }])
    } catch (error) {
      setMessages((current) => [...current, { role: 'assistant', content: error.message, links: [] }])
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {open && (
        <section className="mb-3 flex h-[28rem] w-[min(22rem,calc(100vw-2rem))] flex-col rounded-3xl border border-line bg-white shadow-card">
          <header className="border-b border-line px-4 py-3">
            <p className="font-medium">Assistant</p>
            <p className="text-xs text-ink/60">Guides students and organizations around Future Link.</p>
          </header>
          <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
            {messages.length === 0 && (
              <div>
                <p className="text-sm text-ink/70">Ask about portfolios, applications, publishing, or the place an internship or event is held.</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {(starters[role] || starters.GUEST).map((prompt) => (
                    <button key={prompt} className="rounded-full bg-paper px-3 py-1.5 text-left text-xs" onClick={() => ask(prompt)}>
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((item, index) => (
              <div key={`${item.role}-${index}`} className={item.role === 'user' ? 'ml-8 rounded-2xl bg-mint px-3 py-2 text-sm' : 'mr-4 text-sm'}>
                <p>{item.content}</p>
                {item.links?.length > 0 && (
                  <div className="mt-2 flex flex-col items-start gap-1">
                    {item.links.map((link) => (
                      <button
                        key={link.to + link.label}
                        className="text-left text-sm font-medium text-brand underline"
                        onClick={() => {
                          setOpen(false)
                          navigate(link.to)
                        }}
                      >
                        {link.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {busy && <p className="text-sm text-ink/50">Looking that up…</p>}
          </div>
          <form
            className="flex gap-2 border-t border-line p-3"
            onSubmit={(event) => {
              event.preventDefault()
              ask(text)
            }}
          >
            <input className="field" value={text} onChange={(event) => setText(event.target.value)} placeholder="Ask a question" />
            <button className="rounded-xl bg-brand px-3 text-sm text-white" disabled={busy}>Send</button>
          </form>
        </section>
      )}
      <button className="rounded-full bg-brand px-4 py-3 text-sm font-medium text-white shadow-card" onClick={() => setOpen((value) => !value)}>
        {open ? 'Close assistant' : 'Assistant'}
      </button>
    </div>
  )
}
