"use client"

import { useState, useRef } from "react"
import { AppSidebar } from "@/components/app-sidebar"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { DeleteConfirmation } from "@/components/delete-confirmation"
import { Plus, X, Loader2 } from "lucide-react"
import { HealthStatus } from "@/components/health-status"
import { TicketsTable } from "@/components/tickets-table"
import { TicketFormDialog } from "@/components/ticket-form-dialog"
import {
  useTickets,
  type Ticket,
  type TicketFilters,
  type TicketCreate,
  type TicketUpdate,
} from "@/hooks/use-tickets"
import { useInfiniteScroll } from "@/hooks/use-infinite-scroll"

export default function TicketsPage() {
  const [filters, setFilters] = useState<TicketFilters>({})
  const {
    tickets,
    loading,
    loadingMore,
    error,
    hasNext,
    totalElements,
    loadMore,
    retry,
    createTicket,
    updateTicket,
    deleteTicket,
  } = useTickets(filters)
  const scrollRef = useRef<HTMLDivElement>(null)

  useInfiniteScroll({
    scrollRef,
    loadMore,
    hasNext,
    loading: loadingMore,
  })

  const [formOpen, setFormOpen] = useState(false)
  const [editingTicket, setEditingTicket] = useState<Ticket | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [ticketToDelete, setTicketToDelete] = useState<Ticket | null>(null)

  const clearFilters = () => setFilters({})
  const hasActiveFilters = filters.priority || filters.status || filters.customerId

  const handleAdd = () => {
    setEditingTicket(null)
    setFormOpen(true)
  }

  const handleEdit = (ticket: Ticket) => {
    setEditingTicket(ticket)
    setFormOpen(true)
  }

  const handleDeleteClick = (ticket: Ticket) => {
    setTicketToDelete(ticket)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (ticketToDelete) {
      await deleteTicket(ticketToDelete.id)
      setDeleteDialogOpen(false)
      setTicketToDelete(null)
    }
  }

  const handleFormSubmit = async (data: TicketCreate | TicketUpdate) => {
    if (editingTicket) {
      await updateTicket(editingTicket.id, data as TicketUpdate)
    } else {
      await createTicket(data as TicketCreate)
    }
  }

  return (
    <SidebarProvider className="h-svh">
      <AppSidebar />
      <SidebarInset className="overflow-hidden">
        <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
          <div className="flex flex-1 items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4" />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage>Support Tickets</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
            <div className="ml-auto">
              <HealthStatus />
            </div>
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 overflow-hidden p-4 pt-0">
          <Card className="flex flex-1 flex-col overflow-hidden">
            <CardHeader className="shrink-0 space-y-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-headline-2">Support Tickets</CardTitle>
                <div className="flex items-center gap-4">
                  <span className="text-muted-foreground text-sm">
                    {loading
                      ? "Loading..."
                      : `${(tickets?.length ?? 0).toLocaleString()} of ${(totalElements ?? 0).toLocaleString()} tickets`}
                  </span>
                  <Button onClick={handleAdd}>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Ticket
                  </Button>
                </div>
              </div>
              <div className="flex flex-wrap items-end gap-4">
                <div className="space-y-1">
                  <Label htmlFor="priority-filter">Priority</Label>
                  <Select
                    value={filters.priority || "all"}
                    onValueChange={(v: string) =>
                      setFilters((f) => ({
                        ...f,
                        priority: v === "all" ? null : (v as TicketFilters["priority"]),
                      }))
                    }
                  >
                    <SelectTrigger id="priority-filter" className="w-[120px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="LOW">Low</SelectItem>
                      <SelectItem value="MEDIUM">Medium</SelectItem>
                      <SelectItem value="HIGH">High</SelectItem>
                      <SelectItem value="URGENT">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="status-filter">Status</Label>
                  <Select
                    value={filters.status || "all"}
                    onValueChange={(v: string) =>
                      setFilters((f) => ({
                        ...f,
                        status: v === "all" ? null : (v as TicketFilters["status"]),
                      }))
                    }
                  >
                    <SelectTrigger id="status-filter" className="w-[140px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="OPEN">Open</SelectItem>
                      <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                      <SelectItem value="RESOLVED">Resolved</SelectItem>
                      <SelectItem value="CLOSED">Closed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="customer-filter">Customer ID</Label>
                  <Input
                    id="customer-filter"
                    type="number"
                    placeholder="Any"
                    className="w-[100px]"
                    value={filters.customerId || ""}
                    onChange={(e) =>
                      setFilters((f) => ({
                        ...f,
                        customerId: e.target.value ? Number(e.target.value) : null,
                      }))
                    }
                  />
                </div>
                {hasActiveFilters && (
                  <Button variant="ghost" size="sm" onClick={clearFilters}>
                    <X className="mr-1 h-4 w-4" />
                    Clear
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-hidden">
              {loading ? (
                <div className="text-muted-foreground flex h-full items-center justify-center">
                  <Loader2 className="mr-2 h-6 w-6 animate-spin" />
                  Loading...
                </div>
              ) : error ? (
                <div className="space-y-3 py-8 text-center">
                  <p role="alert" className="text-red-500">
                    {error}
                  </p>
                  <Button variant="outline" disabled={loadingMore} onClick={() => void retry()}>
                    Retry
                  </Button>
                </div>
              ) : (
                <div ref={scrollRef} className="h-full overflow-auto">
                  <TicketsTable
                    tickets={tickets}
                    onEdit={handleEdit}
                    onDelete={handleDeleteClick}
                  />
                  {loadingMore && (
                    <div className="text-muted-foreground flex items-center justify-center py-4">
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Loading more...
                    </div>
                  )}
                  {!hasNext && tickets.length > 0 && (
                    <div className="text-muted-foreground py-4 text-center text-sm">
                      End of results
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <TicketFormDialog
          open={formOpen}
          onOpenChange={setFormOpen}
          ticket={editingTicket}
          onSubmit={handleFormSubmit}
        />

        <DeleteConfirmation
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          title="Delete Ticket"
          onConfirm={handleDeleteConfirm}
        >
          Are you sure you want to delete &quot;{ticketToDelete?.subject}&quot;? This action cannot
          be undone.
        </DeleteConfirmation>
      </SidebarInset>
    </SidebarProvider>
  )
}
