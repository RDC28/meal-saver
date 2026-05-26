type LogLevel = 'debug' | 'info' | 'warn' | 'error'

const isDev = process.env.NODE_ENV !== 'production'

function log(level: LogLevel, ctx: string, msg: string, data?: unknown) {
  const output = isDev
    ? `[${level.toUpperCase()}] ${ctx}: ${msg}${data !== undefined ? ' ' + JSON.stringify(data, null, 0) : ''}`
    : JSON.stringify({ level, ts: new Date().toISOString(), ctx, msg, ...(data !== undefined ? { data } : {}) })

  if (level === 'error') console.error(output)
  else if (level === 'warn') console.warn(output)
  else console.log(output)
}

export const logger = {
  debug: (ctx: string, msg: string, data?: unknown) => {
    if (isDev) log('debug', ctx, msg, data)
  },
  info: (ctx: string, msg: string, data?: unknown) => log('info', ctx, msg, data),
  warn: (ctx: string, msg: string, data?: unknown) => log('warn', ctx, msg, data),
  error: (ctx: string, msg: string, err?: unknown) => {
    const data = err instanceof Error
      ? { message: err.message, stack: isDev ? err.stack : undefined }
      : err
    log('error', ctx, msg, data)
  },
}
