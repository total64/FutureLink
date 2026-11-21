import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import Shell from '../components/Shell'
import { api } from '../lib/api'

const empty = {
  name: '',
  description: '',
  website: '',
  contactEmail: '',
  phone: '',
  location: '',
  logoUrl: '',
  industry: '',
}

export default function OrgProfile() {
  const client = useQueryClient()
  const query = useQuery({ queryKey: ['org-me'], queryFn: () => api('/org/me') })
  const [form, setForm] = useState(empty)
  const [message, setMessage] = useState('')
  const save = useMutation({
    mutationFn: () => api('/org/profile', { method: 'PUT', body: form }),
    onSuccess: (org) => {
      client.setQueryData(['org-me'], org)
      client.invalidateQueries({ queryKey: ['org-dashboard'] })
      setMessage(org.verificationStatus === 'APPROVED'
        ? 'Profile saved. The account is already approved.'
        : 'Profile submitted. An admin will approve or reject the account.')
    },
  })

  useEffect(() => {
    if (!query.data) return
    setForm({
      name: query.data.name || '',
      description: query.data.description || '',
      website: query.data.website || '',
      contactEmail: query.data.contactEmail || '',
      phone: query.data.phone || '',
      location: query.data.location || '',
      logoUrl: query.data.logoUrl || '',
      industry: query.data.industry || '',
    })
  }, [query.data])

  function set(name, value) {
    setForm((current) => ({ ...current, [name]: value }))
  }

  const org = query.data
  return (
    <Shell crumb="Profile">
      <h1 className="font-display text-4xl">Organization profile</h1>
      <p className="mt-2 max-w-2xl text-ink/70">The internship and event dashboard stays closed until this profile is submitted and an admin approves the account.</p>
      {org?.verificationStatus === 'REJECTED' && (
        <p className="mt-4 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-950">Rejected{org.reviewReason ? `: ${org.reviewReason}` : ''}. Update the profile and submit again.</p>
      )}
      {org?.verificationStatus === 'PENDING' && org.profileSubmitted && (
        <p className="mt-4 rounded-2xl bg-mint px-4 py-3 text-sm">Profile submitted. The dashboard opens after an admin approves this organization.</p>
      )}
      {org?.verificationStatus === 'APPROVED' && (
        <p className="mt-4 text-sm text-brand-dark">Approved. <Link to="/org">Open the dashboard</Link>.</p>
      )}
      <form
        className="mt-6 grid max-w-2xl gap-4 rounded-3xl border border-line bg-white p-6"
        onSubmit={(event) => {
          event.preventDefault()
          setMessage('')
          save.mutate()
        }}
      >
        <label className="block"><span className="label">Organization name</span><input className="field" value={form.name} onChange={(e) => set('name', e.target.value)} /></label>
        <label className="block"><span className="label">Logo link</span><input className="field" value={form.logoUrl} onChange={(e) => set('logoUrl', e.target.value)} placeholder="https://…" /></label>
        {form.logoUrl && <img src={form.logoUrl} alt="" className="h-16 w-16 rounded-2xl object-cover" />}
        <label className="block"><span className="label">Description</span><textarea className="field min-h-28" value={form.description} onChange={(e) => set('description', e.target.value)} /></label>
        <label className="block"><span className="label">Website</span><input className="field" value={form.website} onChange={(e) => set('website', e.target.value)} placeholder="https://…" /></label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block"><span className="label">Contact email</span><input className="field" value={form.contactEmail} onChange={(e) => set('contactEmail', e.target.value)} /></label>
          <label className="block"><span className="label">Phone</span><input className="field" value={form.phone} onChange={(e) => set('phone', e.target.value)} /></label>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block"><span className="label">Location</span><input className="field" value={form.location} onChange={(e) => set('location', e.target.value)} /></label>
          <label className="block"><span className="label">Industry</span><input className="field" value={form.industry} onChange={(e) => set('industry', e.target.value)} placeholder="Software" /></label>
        </div>
        {save.error && <p className="text-sm text-red-700">{save.error.message}</p>}
        {message && <p className="text-sm text-brand-dark">{message}</p>}
        <button className="w-fit rounded-xl bg-brand px-4 py-2 text-white" disabled={save.isPending}>
          {save.isPending ? 'Saving…' : 'Submit profile'}
        </button>
      </form>
    </Shell>
  )
}
