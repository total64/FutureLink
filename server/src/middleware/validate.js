import { fail } from '../lib/http.js'

export function validate(schema) {
  return (req, res, next) => {
    const parsed = schema.safeParse({
      body: req.body,
      query: req.query,
      params: req.params,
    })
    if (!parsed.success) {
      const issue = parsed.error.issues[0]
      const field = (issue?.path || []).filter((part) => part !== 'body' && part !== 'query' && part !== 'params').join('.')
      const raw = issue?.message || 'Check the form and try again.'
      const message = field && raw.startsWith('String must') ? `${field}: ${raw}` : raw
      return fail(res, 400, 'VALIDATION', message)
    }
    req.valid = parsed.data
    next()
  }
}
