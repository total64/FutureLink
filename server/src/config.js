import dotenv from 'dotenv'

dotenv.config()

function required(name) {
  const value = process.env[name]
  if (!value) throw new Error(`Missing environment variable ${name}`)
  return value
}

export const env = {
  port: Number(process.env.PORT || 4000),
  clientOrigins: (process.env.CLIENT_ORIGIN || 'http://localhost:5173,http://localhost:5174')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
  nodeEnv: process.env.NODE_ENV || 'development',
  databaseUrl: process.env.DATABASE_URL || '',
  accessSecret: process.env.JWT_ACCESS_SECRET || 'dev-access-secret-change-me',
  refreshSecret: process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret-change-me',
}

export function assertDatabase() {
  required('DATABASE_URL')
}
