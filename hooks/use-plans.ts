"use client"

import { useState, useEffect, useCallback } from "react"
import { fetchCollection, requireOk } from "@/lib/api"

export interface Plan {
  id: number
  name: string
  monthly_price: number
  data_limit_gb: number | null
  minutes_limit: number | null
  sms_limit: number | null
  is_active: boolean
}

export interface PlanCreate {
  name: string
  monthlyPrice: number
  dataLimitGb?: number | null
  minutesLimit?: number | null
  smsLimit?: number | null
}

export interface PlanUpdate extends PlanCreate {
  isActive?: boolean
}

export function usePlans() {
  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchPlans = useCallback(async () => {
    try {
      setLoading(true)
      const data = await fetchCollection<Plan>("/api/plans", "Failed to fetch plans")
      setPlans(data)
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error")
    } finally {
      setLoading(false)
    }
  }, [])

  const createPlan = useCallback(async (plan: PlanCreate) => {
    const res = await fetch("/api/plans", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(plan),
    })
    await requireOk(res, "Failed to create plan")
    const newPlan = await res.json()
    setPlans((prev) => [...prev, newPlan])
    return newPlan
  }, [])

  const updatePlan = useCallback(async (id: number, plan: PlanUpdate) => {
    const res = await fetch(`/api/plans/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(plan),
    })
    await requireOk(res, "Failed to update plan")
    const updated = await res.json()
    setPlans((prev) => prev.map((p) => (p.id === id ? updated : p)))
    return updated
  }, [])

  const deletePlan = useCallback(async (id: number) => {
    const res = await fetch(`/api/plans/${id}`, {
      method: "DELETE",
    })
    await requireOk(res, "Failed to delete plan")
    setPlans((prev) => prev.filter((p) => p.id !== id))
  }, [])

  useEffect(() => {
    fetchPlans()
  }, [fetchPlans])

  return {
    plans,
    loading,
    error,
    fetchPlans,
    createPlan,
    updatePlan,
    deletePlan,
  }
}
