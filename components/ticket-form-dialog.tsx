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
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { Ticket, TicketCreate, TicketUpdate } from "@/hooks/use-tickets"

interface TicketFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  ticket: Ticket | null
  onSubmit: (data: TicketCreate | TicketUpdate) => Promise<void>
}

function TicketForm({
  ticket,
  onSubmit,
  onCancel,
}: {
  ticket: Ticket | null
  onSubmit: (data: TicketCreate | TicketUpdate) => Promise<void>
  onCancel: () => void
}) {
  const isEditing = ticket !== null
  const [customerId, setCustomerId] = useState(ticket?.customer_id?.toString() ?? "")
  const [subject, setSubject] = useState(ticket?.subject ?? "")
  const [description, setDescription] = useState(ticket?.description ?? "")
  const [priority, setPriority] = useState(ticket?.priority ?? "MEDIUM")
  const [status, setStatus] = useState(ticket?.status ?? "OPEN")
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setSubmitError(null)
    try {
      if (isEditing) {
        const data: TicketUpdate = {
          subject,
          description: description || undefined,
          priority,
          status,
        }
        await onSubmit(data)
      } else {
        const data: TicketCreate = {
          customerId: parseInt(customerId),
          subject,
          description: description || undefined,
          priority,
        }
        await onSubmit(data)
      }
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
        <DialogTitle>{isEditing ? "Edit Ticket" : "Create Ticket"}</DialogTitle>
        <DialogDescription>
          {isEditing
            ? "Update the ticket details below."
            : "Fill in the details to create a new support ticket."}
        </DialogDescription>
      </DialogHeader>
      {submitError && (
        <p role="alert" className="text-sm text-red-500">
          {submitError}
        </p>
      )}
      <div className="grid gap-4 py-4">
        {!isEditing && (
          <div className="space-y-2">
            <Label htmlFor="customerId">Customer ID</Label>
            <Input
              id="customerId"
              type="number"
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              placeholder="Enter customer ID"
              required
            />
          </div>
        )}
        <div className="space-y-2">
          <Label htmlFor="subject">Subject</Label>
          <Input
            id="subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Brief description of the issue"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Detailed description of the issue..."
            rows={4}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="priority">Priority</Label>
            <Select
              value={priority}
              onValueChange={(v) => setPriority(v as "LOW" | "MEDIUM" | "HIGH" | "URGENT")}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="LOW">Low</SelectItem>
                <SelectItem value="MEDIUM">Medium</SelectItem>
                <SelectItem value="HIGH">High</SelectItem>
                <SelectItem value="URGENT">Urgent</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {isEditing && (
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={status}
                onValueChange={(v) =>
                  setStatus(v as "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED")
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="OPEN">Open</SelectItem>
                  <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                  <SelectItem value="RESOLVED">Resolved</SelectItem>
                  <SelectItem value="CLOSED">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting ? "Saving..." : isEditing ? "Save Changes" : "Create Ticket"}
        </Button>
      </DialogFooter>
    </form>
  )
}

export function TicketFormDialog({ open, onOpenChange, ticket, onSubmit }: TicketFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        {open && (
          <TicketForm
            key={ticket?.id ?? "new"}
            ticket={ticket}
            onSubmit={onSubmit}
            onCancel={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}
