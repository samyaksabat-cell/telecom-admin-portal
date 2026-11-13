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
import type { Plan, PlanCreate, PlanUpdate } from "@/hooks/use-plans"

interface PlanFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  plan: Plan | null
  onSubmit: (data: PlanCreate | PlanUpdate) => Promise<void>
}

function PlanForm({
  plan,
  onSubmit,
  onCancel,
}: {
  plan: Plan | null
  onSubmit: (data: PlanCreate | PlanUpdate) => Promise<void>
  onCancel: () => void
}) {
  const isEditing = plan !== null
  const [name, setName] = useState(plan?.name ?? "")
  const [monthlyPrice, setMonthlyPrice] = useState(plan?.monthly_price?.toString() ?? "")
  const [dataLimitGb, setDataLimitGb] = useState(plan?.data_limit_gb?.toString() ?? "")
  const [minutesLimit, setMinutesLimit] = useState(plan?.minutes_limit?.toString() ?? "")
  const [smsLimit, setSmsLimit] = useState(plan?.sms_limit?.toString() ?? "")
  const [isActive, setIsActive] = useState(plan?.is_active ?? true)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setSubmitError(null)
    try {
      const data: PlanCreate | PlanUpdate = {
        name,
        monthlyPrice: parseFloat(monthlyPrice) || 0,
        dataLimitGb: dataLimitGb ? parseInt(dataLimitGb) : null,
        minutesLimit: minutesLimit ? parseInt(minutesLimit) : null,
        smsLimit: smsLimit ? parseInt(smsLimit) : null,
        ...(isEditing && { isActive }),
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
        <DialogTitle>{isEditing ? "Edit Plan" : "Add Plan"}</DialogTitle>
        <DialogDescription>
          {isEditing
            ? "Update the plan details below."
            : "Fill in the details to create a new service plan."}
        </DialogDescription>
      </DialogHeader>
      {submitError && (
        <p role="alert" className="text-sm text-red-500">
          {submitError}
        </p>
      )}
      <div className="grid gap-4 py-4">
        <div className="space-y-2">
          <Label htmlFor="name">Plan Name</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Premium Plus"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="monthlyPrice">Monthly Price ($)</Label>
          <Input
            id="monthlyPrice"
            type="number"
            step="0.01"
            value={monthlyPrice}
            onChange={(e) => setMonthlyPrice(e.target.value)}
            placeholder="0.00"
            required
          />
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="dataLimitGb">Data (GB)</Label>
            <Input
              id="dataLimitGb"
              type="number"
              value={dataLimitGb}
              onChange={(e) => setDataLimitGb(e.target.value)}
              placeholder="Unlimited"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="minutesLimit">Minutes</Label>
            <Input
              id="minutesLimit"
              type="number"
              value={minutesLimit}
              onChange={(e) => setMinutesLimit(e.target.value)}
              placeholder="Unlimited"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="smsLimit">SMS</Label>
            <Input
              id="smsLimit"
              type="number"
              value={smsLimit}
              onChange={(e) => setSmsLimit(e.target.value)}
              placeholder="Unlimited"
            />
          </div>
        </div>
        {isEditing && (
          <div className="space-y-2">
            <Label htmlFor="isActive">Status</Label>
            <Select
              value={isActive ? "active" : "inactive"}
              onValueChange={(v) => setIsActive(v === "active")}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting ? "Saving..." : isEditing ? "Save Changes" : "Add Plan"}
        </Button>
      </DialogFooter>
    </form>
  )
}

export function PlanFormDialog({ open, onOpenChange, plan, onSubmit }: PlanFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        {open && (
          <PlanForm
            key={plan?.id ?? "new"}
            plan={plan}
            onSubmit={onSubmit}
            onCancel={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}
