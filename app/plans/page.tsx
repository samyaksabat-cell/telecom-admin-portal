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
import { PlansTable } from "@/components/plans-table"
import { PlanFormDialog } from "@/components/plan-form-dialog"
import { usePlans, type Plan, type PlanCreate, type PlanUpdate } from "@/hooks/use-plans"

export default function PlansPage() {
  const { plans, loading, error, createPlan, updatePlan, deletePlan } = usePlans()

  const [formOpen, setFormOpen] = useState(false)
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [planToDelete, setPlanToDelete] = useState<Plan | null>(null)

  const handleAdd = () => {
    setEditingPlan(null)
    setFormOpen(true)
  }

  const handleEdit = (plan: Plan) => {
    setEditingPlan(plan)
    setFormOpen(true)
  }

  const handleDeleteClick = (plan: Plan) => {
    setPlanToDelete(plan)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (planToDelete) {
      await deletePlan(planToDelete.id)
      setDeleteDialogOpen(false)
      setPlanToDelete(null)
    }
  }

  const handleFormSubmit = async (data: PlanCreate | PlanUpdate) => {
    if (editingPlan) {
      await updatePlan(editingPlan.id, data as PlanUpdate)
    } else {
      await createPlan(data as PlanCreate)
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
                  <BreadcrumbPage>Plans</BreadcrumbPage>
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
              <CardTitle className="text-headline-2">Service Plans</CardTitle>
              <Button onClick={handleAdd}>
                <Plus className="mr-2 h-4 w-4" />
                Add Plan
              </Button>
            </CardHeader>
            <CardContent className="flex-1 overflow-hidden">
              {loading ? (
                <div className="text-muted-foreground py-8 text-center">Loading...</div>
              ) : error ? (
                <div className="py-8 text-center text-red-500">{error}</div>
              ) : (
                <div className="h-full overflow-auto">
                  <PlansTable plans={plans} onEdit={handleEdit} onDelete={handleDeleteClick} />
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <PlanFormDialog
          open={formOpen}
          onOpenChange={setFormOpen}
          plan={editingPlan}
          onSubmit={handleFormSubmit}
        />

        <DeleteConfirmation
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          title="Delete Plan"
          onConfirm={handleDeleteConfirm}
        >
          Are you sure you want to delete &quot;{planToDelete?.name}&quot;? This action cannot be
          undone.
        </DeleteConfirmation>
      </SidebarInset>
    </SidebarProvider>
  )
}
