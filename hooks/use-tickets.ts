"use client"

import { usePagedRecords } from "@/hooks/use-paged-records"
import { requireOk } from "@/lib/api"

export interface Ticket {
  id: number
  customer_id: number
  customer_name: string
  subject: string
  description: string | null
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT"
  status: "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED"
  created_at: string | null
  resolved_at: string | null
}

export interface TicketFilters {
  priority?: "LOW" | "MEDIUM" | "HIGH" | "URGENT" | null
  status?: "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED" | null
  customerId?: number | null
}

export interface TicketCreate {
  customerId: number
  subject: string
  description?: string
  priority: string
}

export interface TicketUpdate {
  customerId?: number
  subject: string
  description?: string
  priority?: string
  status?: string
}

export function useTickets(filters: TicketFilters = {}) {
  const query = new URLSearchParams()
  if (filters.priority) query.set("priority", filters.priority)
  if (filters.status) query.set("status", filters.status)
  if (filters.customerId != null) query.set("customerId", String(filters.customerId))
  const { records: tickets, ...page } = usePagedRecords<Ticket>(
    `/api/tickets?${query}`,
    "Failed to fetch tickets"
  )

  const createTicket = async (ticket: TicketCreate) => {
    const response = await fetch("/api/tickets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(ticket),
    })
    await requireOk(response, "Failed to create ticket")
    const created: Ticket = await response.json()
    await page.refresh()
    return created
  }

  const updateTicket = async (id: number, ticket: TicketUpdate) => {
    const response = await fetch(`/api/tickets/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(ticket),
    })
    await requireOk(response, "Failed to update ticket")
    const updated: Ticket = await response.json()
    await page.refresh()
    return updated
  }

  const deleteTicket = async (id: number) => {
    const response = await fetch(`/api/tickets/${id}`, { method: "DELETE" })
    await requireOk(response, "Failed to delete ticket")
    await page.refresh()
  }

  return { tickets, ...page, createTicket, updateTicket, deleteTicket }
}
