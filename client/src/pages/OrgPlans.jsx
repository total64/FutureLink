import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import Shell from '../components/Shell'
import { api } from '../lib/api'
import { formatDate } from '../lib/format'

export default function OrgPlans() {
  const client = useQueryClient()
  const query = useQuery({ queryKey: ['org-plans'], queryFn: () => api('/org/plans') })
  const [choice, setChoice] = useState(null)
  const [method, setMethod] = useState('Bank transfer')
  const [payerName, setPayerName] = useState('')
  const [reference, setReference] = useState('')
  const [message, setMessage] = useState('')
  const subscribe = useMutation({
    mutationFn: (body) => api('/org/subscription', { method: 'POST', body }),
    onSuccess: (data) => {
      const next = data.organization || data
      setMessage(next.subscriptionStatus === 'ACTIVE' && next.plan === 'FREE'
        ? 'The Free plan is active.'
        : 'Payment submitted. An admin confirms it before the paid plan starts.')
      setChoice(null)
      client.invalidateQueries({ queryKey: ['org-plans'] })
      client.invalidateQueries({ queryKey: ['org-me'] })
      client.invalidateQueries({ queryKey: ['org-dashboard'] })
    },
  })

  const data = query.data
  const org = data?.organization
  const sub = org?.subscription
  const pending = sub?.pendingPayment

  function choose(plan, period) {
    setMessage('')
    subscribe.reset()
    if (plan === 'FREE') {
      subscribe.mutate({ plan: 'FREE', billingPeriod: 'NONE' })
      return
    }
    setChoice({ plan, period })
  }

  return (
    <Shell crumb="Subscription">
      <h1 className="font-display text-4xl">Subscription</h1>
      <p className="mt-2 max-w-2xl text-ink/70">Approved organizations choose a plan here. Example prices. Free starts immediately. Basic and Premium start after an admin confirms the payment.</p>
      {query.isLoading && <p className="mt-6">Loading…</p>}
      {org && org.verificationStatus !== 'APPROVED' && (
        <p className="mt-4 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-950">Plans open after an admin approves the organization.</p>
      )}
      {sub?.active && (
        <p className="mt-4 rounded-2xl bg-mint px-4 py-3 text-sm">
          Current plan: {sub.plan}{sub.endsAt ? ` · renews or ends ${formatDate(sub.endsAt)}` : ' · no expiry'}.
          {sub.renewSoon ? ' Renew before it ends.' : ''}
        </p>
      )}
      {sub?.status === 'EXPIRED' && <p className="mt-4 rounded-2xl bg-amber-50 px-4 py-3 text-sm">This subscription has expired. Choose a plan to continue publishing.</p>}
      {pending && (
        <p className="mt-4 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-950">
          Payment pending: {pending.plan} · {pending.amount} {pending.currency} · {pending.method} · reference {pending.reference}. Waiting for admin confirmation.
        </p>
      )}
      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        {(data?.plans || []).map((plan) => (
          <article key={plan.code} className="flex flex-col rounded-3xl border border-line bg-white p-5">
            <p className="text-sm text-ink/50">{plan.summary}</p>
            <h2 className="mt-1 font-display text-3xl">{plan.name}</h2>
            <ul className="mt-4 space-y-2 text-sm text-ink/80">
              {plan.features.map((feature) => <li key={feature}>{feature}</li>)}
            </ul>
            <div className="mt-auto space-y-2 pt-5">
              {plan.prices.map((price) => (
                <button
                  key={price.period}
                  className="w-full rounded-xl bg-brand px-3 py-2 text-sm text-white disabled:opacity-40"
                  disabled={org?.verificationStatus !== 'APPROVED' || subscribe.isPending}
                  onClick={() => choose(plan.code, price.period)}
                >
                  {price.amount === 0 ? 'Start Free' : `Choose ${price.label}`}
                </button>
              ))}
            </div>
          </article>
        ))}
      </div>
      {choice && (
        <form
          className="mt-6 max-w-xl rounded-3xl border border-line bg-white p-5"
          onSubmit={(event) => {
            event.preventDefault()
            subscribe.mutate({ plan: choice.plan, billingPeriod: choice.period, method, payerName, reference })
          }}
        >
          <h2 className="font-display text-2xl">Pay for {choice.plan}</h2>
          <p className="mt-2 text-sm text-ink/70">{data?.paymentNote}</p>
          <p className="mt-2 text-sm">Send the amount, then enter the reference from the receipt. Use reference prefix FL-{org?.name?.slice(0, 12) || 'ORG'}.</p>
          <label className="mt-4 block"><span className="label">Payment method</span>
            <select className="field" value={method} onChange={(e) => setMethod(e.target.value)}>
              <option>Bank transfer</option>
              <option>Telebirr</option>
            </select>
          </label>
          <label className="mt-3 block"><span className="label">Payer name</span><input className="field" value={payerName} onChange={(e) => setPayerName(e.target.value)} /></label>
          <label className="mt-3 block"><span className="label">Payment reference</span><input className="field" value={reference} onChange={(e) => setReference(e.target.value)} /></label>
          <button className="mt-4 rounded-xl bg-brand px-4 py-2 text-white" disabled={subscribe.isPending}>Submit payment</button>
        </form>
      )}
      {subscribe.error && <p className="mt-4 text-sm text-red-700">{subscribe.error.message}</p>}
      {message && !pending && <p className="mt-4 text-sm text-brand-dark">{message}</p>}
    </Shell>
  )
}
