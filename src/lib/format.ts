import type { Currency } from '../data/repository'

export function formatMoney(amount: number, currency: Currency): string {
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
