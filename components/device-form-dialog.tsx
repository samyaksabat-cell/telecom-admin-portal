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
import type { Device, DeviceCreate, DeviceUpdate } from "@/hooks/use-devices"

interface DeviceFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  device: Device | null
  onSubmit: (data: DeviceCreate | DeviceUpdate) => Promise<void>
}

function DeviceForm({
  device,
  onSubmit,
  onCancel,
}: {
  device: Device | null
  onSubmit: (data: DeviceCreate | DeviceUpdate) => Promise<void>
  onCancel: () => void
}) {
  const isEditing = device !== null
  const [imei, setImei] = useState(device?.imei ?? "")
  const [model, setModel] = useState(device?.model ?? "")
  const [simNumber, setSimNumber] = useState(device?.sim_number ?? "")
  const [customerId, setCustomerId] = useState(device?.customer_id?.toString() ?? "")
  const [status, setStatus] = useState(device?.status ?? "AVAILABLE")
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setSubmitError(null)
    try {
      const data: DeviceCreate | DeviceUpdate = {
        imei,
        model,
        simNumber,
        customerId: customerId ? parseInt(customerId) : null,
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
        <DialogTitle>{isEditing ? "Edit Device" : "Add Device"}</DialogTitle>
        <DialogDescription>
          {isEditing
            ? "Update the device details below."
            : "Fill in the details to register a new device."}
        </DialogDescription>
      </DialogHeader>
      {submitError && (
        <p role="alert" className="text-sm text-red-500">
          {submitError}
        </p>
      )}
      <div className="grid gap-4 py-4">
        <div className="space-y-2">
          <Label htmlFor="imei">IMEI</Label>
          <Input
            id="imei"
            value={imei}
            onChange={(e) => setImei(e.target.value)}
            placeholder="15-digit IMEI number"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="model">Model</Label>
          <Input
            id="model"
            value={model}
            onChange={(e) => setModel(e.target.value)}
            placeholder="e.g., iPhone 15 Pro"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="simNumber">SIM Number</Label>
          <Input
            id="simNumber"
            value={simNumber}
            onChange={(e) => setSimNumber(e.target.value)}
            placeholder="SIM card number"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="customerId">Customer ID (optional)</Label>
          <Input
            id="customerId"
            type="number"
            value={customerId}
            onChange={(e) => setCustomerId(e.target.value)}
            placeholder="Leave empty if unassigned"
          />
        </div>
        {isEditing && (
          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select
              value={status}
              onValueChange={(v) => setStatus(v as "AVAILABLE" | "ASSIGNED" | "LOST" | "DAMAGED")}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="AVAILABLE">Available</SelectItem>
                <SelectItem value="ASSIGNED">Assigned</SelectItem>
                <SelectItem value="LOST">Lost</SelectItem>
                <SelectItem value="DAMAGED">Damaged</SelectItem>
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
          {submitting ? "Saving..." : isEditing ? "Save Changes" : "Add Device"}
        </Button>
      </DialogFooter>
    </form>
  )
}

export function DeviceFormDialog({ open, onOpenChange, device, onSubmit }: DeviceFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        {open && (
          <DeviceForm
            key={device?.id ?? "new"}
            device={device}
            onSubmit={onSubmit}
            onCancel={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}
