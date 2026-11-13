import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { CustomerFormDialog } from "@/components/customer-form-dialog"
import { PlanFormDialog } from "@/components/plan-form-dialog"
import { DeviceFormDialog } from "@/components/device-form-dialog"
import { TicketFormDialog } from "@/components/ticket-form-dialog"
import { DeleteConfirmation } from "@/components/delete-confirmation"
import type { Customer } from "@/hooks/use-customers"
import type { Plan } from "@/hooks/use-plans"
import type { Device } from "@/hooks/use-devices"
import type { Ticket } from "@/hooks/use-tickets"

afterEach(cleanup)

const customer: Customer = {
  id: 1,
  first_name: "First",
  last_name: "Last",
  email: "first@example.test",
  phone: "555",
  plan_id: 2,
  plan_name: "Plan",
  status: "SUSPENDED",
  balance: 4,
  activated_at: null,
  created_at: "2025-01-01T00:00:00Z",
}
const plan: Plan = {
  id: 2,
  name: "Plan",
  monthly_price: 10,
  data_limit_gb: 5,
  minutes_limit: 10,
  sms_limit: 20,
  is_active: false,
}
const device: Device = {
  id: 3,
  imei: "123",
  model: "Test model",
  sim_number: "456",
  customer_id: 1,
  customer_name: "First Last",
  status: "LOST",
  assigned_at: "2025-01-01T00:00:00Z",
  created_at: "2025-01-01T00:00:00Z",
}
const ticket: Ticket = {
  id: 4,
  customer_id: 1,
  customer_name: "First Last",
  subject: "Question",
  description: "",
  priority: "URGENT",
  status: "RESOLVED",
  created_at: "2025-01-01T00:00:00Z",
  resolved_at: "2025-01-02T00:00:00Z",
}

describe("form submission errors", () => {
  const cases = [
    {
      name: "customer",
      dialog: (submit: () => Promise<void>, close: (open: boolean) => void) => (
        <CustomerFormDialog
          open
          customer={customer}
          plans={[plan]}
          onSubmit={submit}
          onOpenChange={close}
        />
      ),
      payload: { status: "SUSPENDED", balance: 4, planId: 2 },
    },
    {
      name: "plan",
      dialog: (submit: () => Promise<void>, close: (open: boolean) => void) => (
        <PlanFormDialog open plan={plan} onSubmit={submit} onOpenChange={close} />
      ),
      payload: { isActive: false, monthlyPrice: 10 },
    },
    {
      name: "device",
      dialog: (submit: () => Promise<void>, close: (open: boolean) => void) => (
        <DeviceFormDialog open device={device} onSubmit={submit} onOpenChange={close} />
      ),
      payload: { status: "LOST", customerId: 1 },
    },
    {
      name: "ticket",
      dialog: (submit: () => Promise<void>, close: (open: boolean) => void) => (
        <TicketFormDialog open ticket={ticket} onSubmit={submit} onOpenChange={close} />
      ),
      payload: { priority: "URGENT", status: "RESOLVED", description: undefined },
    },
  ]

  it.each(cases)(
    "$name keeps failed edits open, preserves choices, and supports retry",
    async ({ dialog, payload }) => {
      const submit = vi
        .fn()
        .mockRejectedValueOnce(new Error("Server rejected this change"))
        .mockResolvedValueOnce(undefined)
      const close = vi.fn()
      render(dialog(submit, close))
      fireEvent.submit(screen.getByRole("dialog").querySelector("form")!)
      expect(await screen.findByRole("alert")).toHaveTextContent("Server rejected this change")
      expect(close).not.toHaveBeenCalled()
      expect(submit).toHaveBeenLastCalledWith(expect.objectContaining(payload))
      expect(screen.getByRole("button", { name: "Save Changes" })).not.toBeDisabled()
      fireEvent.submit(screen.getByRole("dialog").querySelector("form")!)
      await waitFor(() => expect(close).toHaveBeenCalledWith(false))
      expect(screen.queryByRole("alert")).not.toBeInTheDocument()
      expect(submit).toHaveBeenCalledTimes(2)
    }
  )

  it("keeps a blank optional description on ticket creation", async () => {
    const submit = vi.fn().mockResolvedValue(undefined)
    render(<TicketFormDialog open ticket={null} onSubmit={submit} onOpenChange={vi.fn()} />)
    fireEvent.change(screen.getByLabelText("Customer ID"), { target: { value: "1" } })
    fireEvent.change(screen.getByLabelText("Subject"), { target: { value: "Blank description" } })
    fireEvent.submit(screen.getByRole("dialog").querySelector("form")!)
    await waitFor(() =>
      expect(submit).toHaveBeenCalledWith({
        customerId: 1,
        subject: "Blank description",
        description: undefined,
        priority: "MEDIUM",
      })
    )
  })

  it.each(cases)("$name cancel does not save", ({ dialog }) => {
    const submit = vi.fn()
    const close = vi.fn()
    render(dialog(submit, close))
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }))
    expect(submit).not.toHaveBeenCalled()
    expect(close).toHaveBeenCalledWith(false)
  })
})

describe("delete confirmation", () => {
  it("shows a conflict without closing and permits a successful retry", async () => {
    const confirm = vi
      .fn()
      .mockRejectedValueOnce(new Error("Customer has history"))
      .mockResolvedValueOnce(undefined)
    const close = vi.fn()
    render(
      <DeleteConfirmation open title="Delete Customer" onConfirm={confirm} onOpenChange={close}>
        This cannot be undone.
      </DeleteConfirmation>
    )
    fireEvent.click(screen.getByRole("button", { name: "Delete" }))
    expect(await screen.findByRole("alert")).toHaveTextContent("Customer has history")
    expect(screen.getByRole("alertdialog")).toBeVisible()
    expect(close).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole("button", { name: "Delete" }))
    await waitFor(() => expect(close).toHaveBeenCalledWith(false))
  })

  it("prevents repeat deletion and cancel while the request is pending", async () => {
    let resolve!: () => void
    const confirm = vi.fn(
      () =>
        new Promise<void>((done) => {
          resolve = done
        })
    )
    render(
      <DeleteConfirmation open title="Delete Plan" onConfirm={confirm} onOpenChange={vi.fn()}>
        This cannot be undone.
      </DeleteConfirmation>
    )
    fireEvent.click(screen.getByRole("button", { name: "Delete" }))
    const deleting = screen.getByRole("button", { name: "Deleting..." })
    expect(deleting).toBeDisabled()
    expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled()
    fireEvent.click(deleting)
    expect(confirm).toHaveBeenCalledTimes(1)
    await act(async () => resolve())
  })
})
