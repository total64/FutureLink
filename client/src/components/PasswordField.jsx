import { useState } from 'react'

export default function PasswordField({ label, value, onChange, name, hint, autoComplete = 'current-password', required = true }) {
  const [visible, setVisible] = useState(false)
  return (
    <label className="block">
      <span className="label">{label}</span>
      <span className="relative block">
        <input
          className="field pr-12"
          type={visible ? 'text' : 'password'}
          name={name}
          value={value}
          onChange={onChange}
          autoComplete={autoComplete}
          required={required}
        />
        <button
          type="button"
          className="absolute right-3 top-1/2 -translate-y-1/2 text-ink/55"
          aria-label={visible ? 'Hide password' : 'Show password'}
          onClick={() => setVisible((current) => !current)}
        >
          {visible ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
              <path d="M3 3l18 18" />
              <path d="M10.6 10.6a2 2 0 002.8 2.8" />
              <path d="M9.9 5.2A10.8 10.8 0 0112 5c5.5 0 9.5 4.2 10.7 7-0.4 1-1.2 2.3-2.3 3.5M6.1 6.1C4.2 7.4 2.8 9.2 1.3 12 2.5 14.8 6.5 19 12 19c1.3 0 2.5-.2 3.6-.6" />
            </svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
              <path d="M1.3 12C2.5 9.2 6.5 5 12 5s9.5 4.2 10.7 7c-1.2 2.8-5.2 7-10.7 7S2.5 14.8 1.3 12z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          )}
        </button>
      </span>
      {hint && <span className="mt-1 block text-xs text-ink/50">{hint}</span>}
    </label>
  )
}
