import { fail } from '../lib/http.js'

export function validate(schema) {
  return (req, res, next) => {
    const parsed = schema.safeParse({
      body: req.body,
      query: req.query,
      params: req.params,
    })
    if (!parsed.success) {
      const message = parsed.error.issues[0]?.message || 'Check the form and try again.'
      return fail(res, 400, 'VALIDATION', message)
    }
    req.valid = parsed.data
    next()
  }
}
