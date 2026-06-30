import type { Currency } from '../data/repository'

export function todayInArgentina(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Argentina/Tucuman',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}

export function formatMoney(amount: number, currency: Currency): string {
  if (currency === 'USDT') {
    return `USDT ${new Intl.NumberFormat('es-AR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 8,
    }).format(amount)}`
  }
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency,
    maximumFractionDigits: currency === 'ARS' ? 0 : 2,
  }).format(amount)
}

export function formatShortDate(date: string): string {
  return new Intl.DateTimeFormat('es-AR', {
    day: '2-digit',
    month: 'short',
  }).format(new Date(`${date}T12:00:00`))
}

export function formatLongDate(date = new Date()): string {
  return new Intl.DateTimeFormat('es-AR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(date)
}

export function formatDateTime(date: string): string {
  return new Intl.DateTimeFormat('es-AR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Argentina/Tucuman',
  }).format(new Date(date))
}
