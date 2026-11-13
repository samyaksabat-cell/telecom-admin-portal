"use client"

import { usePagedRecords } from "@/hooks/use-paged-records"

export interface UsageRecord {
  id: number
  customer_id: number
  customer_name: string
  type: "CALL" | "DATA" | "SMS"
  quantity: number
  cost: number
  recorded_at: string | null
}

export interface UsageFilters {
  type?: "CALL" | "DATA" | "SMS" | null
  customerId?: number | null
  dateFrom?: string | null
  dateTo?: string | null
}

export function useUsage(filters: UsageFilters = {}) {
  const query = new URLSearchParams()
  if (filters.type) query.set("type", filters.type)
  if (filters.customerId != null) query.set("customerId", String(filters.customerId))
  if (filters.dateFrom) query.set("dateFrom", filters.dateFrom)
  if (filters.dateTo) query.set("dateTo", filters.dateTo)
  const { records, ...page } = usePagedRecords<UsageRecord>(
    `/api/usage?${query}`,
    "Failed to fetch usage records"
  )
  return { records, ...page }
}
