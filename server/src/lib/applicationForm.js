export function applicationFields(opportunity) {
  const fields = Array.isArray(opportunity?.applicationForm) ? opportunity.applicationForm : []
  if (fields.length > 0) return fields
  return [{ id: 'why', label: 'Why are you applying?', type: 'long', required: true, options: [] }]
}

export function checkAnswers(fields, answers) {
  const clean = {}
  for (const field of fields) {
    const value = String(answers?.[field.id] || '').trim()
    if (field.required && !value) return { error: `Answer “${field.label}”.` }
    if (field.type === 'choice' && value && !(field.options || []).includes(value)) {
      return { error: `Choose one option for “${field.label}”.` }
    }
    if (value.length > 4000) return { error: `“${field.label}” is too long.` }
    if (value) clean[field.id] = value
  }
  return { answers: clean }
}
