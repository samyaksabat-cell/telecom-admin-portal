"use client"

import { useState, useEffect, useCallback } from "react"
import { fetchCollection, requireOk } from "@/lib/api"

export interface Customer {
  id: number
  first_name: string
  last_name: string
  email: string
  phone: string
  plan_id: number | null
  plan_name: string | null
  status: "ACTIVE" | "SUSPENDED" | "CANCELLED"
  balance: number
  activated_at: string | null
  created_at: string | null
}

export interface CustomerCreate {
  firstName: string
  lastName: string
  email: string
  phone: string
  planId: number
  balance?: number
}

export interface CustomerUpdate extends CustomerCreate {
  status?: string
}

export function useCustomers() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchCustomers = useCallback(async () => {
    try {
      setLoading(true)
      const data = await fetchCollection<Customer>("/api/customers", "Failed to fetch customers")
      setCustomers(data)
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error")
    } finally {
      setLoading(false)
    }
  }, [])

  const createCustomer = useCallback(async (customer: CustomerCreate) => {
    const res = await fetch("/api/customers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(customer),
    })
    await requireOk(res, "Failed to create customer")
    const newCustomer = await res.json()
    setCustomers((prev) => [...prev, newCustomer])
    return newCustomer
  }, [])

  const updateCustomer = useCallback(async (id: number, customer: CustomerUpdate) => {
    const res = await fetch(`/api/customers/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(customer),
    })
    await requireOk(res, "Failed to update customer")
    const updated = await res.json()
    setCustomers((prev) => prev.map((c) => (c.id === id ? updated : c)))
    return updated
  }, [])

  const deleteCustomer = useCallback(async (id: number) => {
    const res = await fetch(`/api/customers/${id}`, {
      method: "DELETE",
    })
    await requireOk(res, "Failed to delete customer")
    setCustomers((prev) => prev.filter((c) => c.id !== id))
  }, [])

  useEffect(() => {
    fetchCustomers()
  }, [fetchCustomers])

  return {
    customers,
    loading,
    error,
    fetchCustomers,
    createCustomer,
    updateCustomer,
    deleteCustomer,
  }
}
