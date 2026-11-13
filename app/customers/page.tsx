"use client"

import { useState } from "react"
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
import { DeleteConfirmation } from "@/components/delete-confirmation"
import { Plus } from "lucide-react"
import { HealthStatus } from "@/components/health-status"
import { CustomersTable } from "@/components/customers-table"
import { CustomerFormDialog } from "@/components/customer-form-dialog"
import {
  useCustomers,
  type Customer,
  type CustomerCreate,
  type CustomerUpdate,
} from "@/hooks/use-customers"
import { usePlans } from "@/hooks/use-plans"

export default function CustomersPage() {
  const { customers, loading, error, createCustomer, updateCustomer, deleteCustomer } =
    useCustomers()
  const { plans } = usePlans()

  const [formOpen, setFormOpen] = useState(false)
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null)

  const handleAdd = () => {
    setEditingCustomer(null)
    setFormOpen(true)
  }

  const handleEdit = (customer: Customer) => {
    setEditingCustomer(customer)
    setFormOpen(true)
  }

  const handleDeleteClick = (customer: Customer) => {
    setCustomerToDelete(customer)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (customerToDelete) {
      await deleteCustomer(customerToDelete.id)
      setDeleteDialogOpen(false)
      setCustomerToDelete(null)
    }
  }

  const handleFormSubmit = async (data: CustomerCreate | CustomerUpdate) => {
    if (editingCustomer) {
      await updateCustomer(editingCustomer.id, data as CustomerUpdate)
    } else {
      await createCustomer(data as CustomerCreate)
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
                  <BreadcrumbPage>Customers</BreadcrumbPage>
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
            <CardHeader className="flex shrink-0 flex-row items-center justify-between space-y-0 pb-4">
              <CardTitle className="text-headline-2">Customers</CardTitle>
              <Button onClick={handleAdd}>
                <Plus className="mr-2 h-4 w-4" />
                Add Customer
              </Button>
            </CardHeader>
            <CardContent className="flex-1 overflow-hidden">
              {loading ? (
                <div className="text-muted-foreground py-8 text-center">Loading...</div>
              ) : error ? (
                <div className="py-8 text-center text-red-500">{error}</div>
              ) : (
                <div className="h-full overflow-auto">
                  <CustomersTable
                    customers={customers}
                    onEdit={handleEdit}
                    onDelete={handleDeleteClick}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <CustomerFormDialog
          open={formOpen}
          onOpenChange={setFormOpen}
          customer={editingCustomer}
          plans={plans}
          onSubmit={handleFormSubmit}
        />

        <DeleteConfirmation
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          title="Delete Customer"
          onConfirm={handleDeleteConfirm}
        >
          Are you sure you want to delete {customerToDelete?.first_name}{" "}
          {customerToDelete?.last_name}? This action cannot be undone.
        </DeleteConfirmation>
      </SidebarInset>
    </SidebarProvider>
  )
}
