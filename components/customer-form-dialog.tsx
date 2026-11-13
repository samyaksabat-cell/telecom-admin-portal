"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { Customer, CustomerCreate, CustomerUpdate } from "@/hooks/use-customers"
import type { Plan } from "@/hooks/use-plans"

interface CustomerFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  customer: Customer | null
  plans: Plan[]
  onSubmit: (data: CustomerCreate | CustomerUpdate) => Promise<void>
}

function CustomerForm({
  customer,
  plans,
  onSubmit,
  onCancel,
}: {
  customer: Customer | null
  plans: Plan[]
  onSubmit: (data: CustomerCreate | CustomerUpdate) => Promise<void>
  onCancel: () => void
}) {
  const isEditing = customer !== null
  const [firstName, setFirstName] = useState(customer?.first_name ?? "")
  const [lastName, setLastName] = useState(customer?.last_name ?? "")
  const [email, setEmail] = useState(customer?.email ?? "")
  const [phone, setPhone] = useState(customer?.phone ?? "")
  const [planId, setPlanId] = useState(customer?.plan_id?.toString() ?? "")
  const [status, setStatus] = useState(customer?.status ?? "ACTIVE")
  const [balance, setBalance] = useState(customer?.balance?.toString() ?? "0")
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setSubmitError(null)
    try {
      const data: CustomerCreate | CustomerUpdate = {
        firstName,
        lastName,
        email,
        phone,
        planId: parseInt(planId),
        balance: parseFloat(balance) || 0,
        ...(isEditing && { status }),
      }
      await onSubmit(data)
      onCancel()
    } catch (failure) {
      setSubmitError(failure instanceof Error ? failure.message : "Failed to save record")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <DialogHeader>
        <DialogTitle>{isEditing ? "Edit Customer" : "Add Customer"}</DialogTitle>
        <DialogDescription>
          {isEditing
            ? "Update the customer details below."
            : "Fill in the details to create a new customer."}
        </DialogDescription>
      </DialogHeader>
      {submitError && (
        <p role="alert" className="text-sm text-red-500">
          {submitError}
        </p>
      )}
      <div className="grid gap-4 py-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="firstName">First Name</Label>
            <Input
              id="firstName"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lastName">Last Name</Label>
            <Input
              id="lastName"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              required
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone">Phone</Label>
          <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="plan">Plan</Label>
          <Select value={planId} onValueChange={setPlanId} required>
            <SelectTrigger>
              <SelectValue placeholder="Select a plan" />
            </SelectTrigger>
            <SelectContent>
              {plans
                .filter((p) => p.is_active)
                .map((plan) => (
                  <SelectItem key={plan.id} value={plan.id.toString()}>
                    {plan.name} - ${plan.monthly_price}/mo
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>
        {isEditing && (
          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select
              value={status}
              onValueChange={(v) => setStatus(v as "ACTIVE" | "SUSPENDED" | "CANCELLED")}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="SUSPENDED">Suspended</SelectItem>
                <SelectItem value="CANCELLED">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
        <div className="space-y-2">
          <Label htmlFor="balance">Balance ($)</Label>
          <Input
            id="balance"
            type="number"
            step="0.01"
            value={balance}
            onChange={(e) => setBalance(e.target.value)}
          />
        </div>
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting ? "Saving..." : isEditing ? "Save Changes" : "Add Customer"}
        </Button>
      </DialogFooter>
    </form>
  )
}

export function CustomerFormDialog({
  open,
  onOpenChange,
  customer,
  plans,
  onSubmit,
}: CustomerFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        {open && (
          <CustomerForm
            key={customer?.id ?? "new"}
            customer={customer}
            plans={plans}
            onSubmit={onSubmit}
            onCancel={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}
