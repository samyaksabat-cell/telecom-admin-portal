"use client"

import { useState, useEffect, useCallback } from "react"

export interface DashboardStats {
  active_customers: number
  monthly_revenue: number
  open_tickets: number
  devices_in_use: number
}

export interface ChartData {
  name: string
  value: number
}

export interface RevenueData {
  name: string
  revenue: number
}

export function useDashboardStats() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [customersByPlan, setCustomersByPlan] = useState<ChartData[]>([])
  const [devicesByStatus, setDevicesByStatus] = useState<ChartData[]>([])
  const [ticketsByStatus, setTicketsByStatus] = useState<ChartData[]>([])
  const [revenueByPlan, setRevenueByPlan] = useState<RevenueData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true)
      const [statsRes, customersPlanRes, devicesStatusRes, ticketsStatusRes, revenueRes] =
        await Promise.all([
          fetch("/api/dashboard/stats"),
          fetch("/api/dashboard/customers-by-plan"),
          fetch("/api/dashboard/devices-by-status"),
          fetch("/api/dashboard/tickets-by-status"),
          fetch("/api/dashboard/revenue-by-plan"),
        ])

      const responses = [statsRes, customersPlanRes, devicesStatusRes, ticketsStatusRes, revenueRes]
      if (responses.some((response) => !response.ok)) throw new Error("Failed to fetch stats")
      const [stats, customers, devices, tickets, revenue] = await Promise.all(
        responses.map((response) => response.json())
      )
      setStats(stats)
      setCustomersByPlan(customers)
      setDevicesByStatus(devices)
      setTicketsByStatus(tickets)
      setRevenueByPlan(revenue)
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  return {
    stats,
    customersByPlan,
    devicesByStatus,
    ticketsByStatus,
    revenueByPlan,
    loading,
    error,
    fetchStats,
  }
}
