'use client'

import useSWR from 'swr'
import { z } from 'zod'
import { leaderboardResponseSchema, transactionSchema, transactionsResponseSchema, type LeaderboardRow, type Transaction } from '@/types/commissions'

const swrConfig = { revalidateOnFocus: true, dedupingInterval: 5000 }

const parseTransaction = (row: any): Transaction => {
  const parsed = transactionSchema.safeParse(row)
  if (parsed.success) return parsed.data
  return {
    Agent: String(row?.Agent ?? ''),
    'Valoare Tranzactie': 0,
    'Tip Tranzactie': 'Vanzare',
    'Comision %': 0,
    Comision: 0,
    Timestamp: String(row?.Timestamp ?? ''),
  }
}

const computeCommission = (t: Transaction): number => {
  if (t.Comision && t.Comision > 0) return t.Comision
  const pct = typeof t['Comision %'] === 'number' ? t['Comision %'] : 0
  const valoare = typeof t['Valoare Tranzactie'] === 'number' ? t['Valoare Tranzactie'] : 0
  const commission = valoare * (pct > 1 ? pct / 100 : pct)
  return Number.isFinite(commission) ? commission : 0
}

const sortByDateDesc = (a: Transaction, b: Transaction) => {
  const ta = Date.parse(a.Timestamp)
  const tb = Date.parse(b.Timestamp)
  return (isNaN(tb) ? 0 : tb) - (isNaN(ta) ? 0 : ta)
}

export const useTransactions = (params?: { since?: string; agent?: string }) => {
  const key = typeof window !== 'undefined' ? ['local/transactions', params?.since ?? '', params?.agent ?? ''] : null
  const fetcher = async () => {
    // Use local API instead of Google Sheets
    const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'
    const url = new URL('/api/transactions-local', origin)
    if (params?.since) url.searchParams.set('since', params.since)
    if (params?.agent) url.searchParams.set('agent', params.agent)
    
    const response = await fetch(url.toString())
    const json = await response.json()
    
    const parsed = transactionsResponseSchema.safeParse(json)
    if (!parsed.success) {
      // Fallback permissive parse
      const rows: Transaction[] = Array.isArray((json as any)?.rows)
        ? (json as any).rows.map(parseTransaction)
        : []
      return { updatedAt: new Date().toISOString(), count: rows.length, rows: rows.sort(sortByDateDesc) }
    }
    const safeRows = parsed.data.rows.map(parseTransaction).sort(sortByDateDesc)
    return { ...parsed.data, rows: safeRows }
  }
  const { data, error, isLoading, mutate } = useSWR(key, fetcher, { 
    ...swrConfig, 
    refreshInterval: 10000,
    revalidateOnMount: true,
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
  })
  return { data, error, isLoading, refresh: mutate }
}

export const aggregateFromTransactions = (rows: Transaction[]): LeaderboardRow[] => {
  const map = new Map<string, { Agent: string; NrTranzactii: number; SumaValoare: number; SumaComision: number }>()
  for (const r of rows) {
    const key = r.Agent
    const prev = map.get(key) || { Agent: r.Agent, NrTranzactii: 0, SumaValoare: 0, SumaComision: 0 }
    const valoare = typeof r['Valoare Tranzactie'] === 'number' ? r['Valoare Tranzactie'] : 0
    const comision = computeCommission(r)
    prev.NrTranzactii += 1
    prev.SumaValoare += Number.isFinite(valoare) ? valoare : 0
    prev.SumaComision += Number.isFinite(comision) ? comision : 0
    map.set(key, prev)
  }
  const arr = Array.from(map.values())
    .sort((a, b) => b.SumaComision - a.SumaComision)
    .map((r, idx) => ({ Rank: idx + 1, ...r }))
  return arr
}

export const useLeaderboard = (params?: { since?: string; agent?: string }) => {
  const key = typeof window !== 'undefined' ? ['local/leaderboard', params?.since ?? '', params?.agent ?? ''] : null
  const fetcher = async () => {
    // Use local API instead of Google Sheets
    const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'
    const url = new URL('/api/leaderboard-local', origin)
    if (params?.since) url.searchParams.set('since', params.since)
    if (params?.agent) url.searchParams.set('agent', params.agent)
    
    const response = await fetch(url.toString())
    const json = await response.json()
    const parsed = leaderboardResponseSchema.safeParse(json)
    if (!parsed.success) throw new Error('Invalid leaderboard payload')
    const rows = parsed.data.rows
      .slice()
      .sort((a, b) => b.SumaComision - a.SumaComision)
      .map((r, i) => ({ ...r, Rank: i + 1 }))
    return { ...parsed.data, rows }
  }
  const { data, error, isLoading, mutate } = useSWR(key, fetcher, { ...swrConfig, refreshInterval: 10000 })

  // Fallback: if server leaderboard fails, pull transactions and aggregate
  const tx = useTransactions(params)

  const rows: LeaderboardRow[] | undefined =
    data?.rows || (tx.data?.rows ? aggregateFromTransactions(tx.data.rows) : undefined)

  return {
    data: rows ? { updatedAt: data?.updatedAt || tx.data?.updatedAt || new Date().toISOString(), count: rows.length, rows } : undefined,
    error,
    isLoading: isLoading && !rows,
    refresh: mutate,
  }
}

export const parseIsoDate = (d?: string) => (d ? new Date(d) : undefined)

