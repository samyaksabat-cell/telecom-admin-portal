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
import { DevicesTable } from "@/components/devices-table"
import { DeviceFormDialog } from "@/components/device-form-dialog"
import { useDevices, type Device, type DeviceCreate, type DeviceUpdate } from "@/hooks/use-devices"

export default function DevicesPage() {
  const { devices, loading, error, createDevice, updateDevice, deleteDevice } = useDevices()

  const [formOpen, setFormOpen] = useState(false)
  const [editingDevice, setEditingDevice] = useState<Device | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deviceToDelete, setDeviceToDelete] = useState<Device | null>(null)

  const handleAdd = () => {
    setEditingDevice(null)
    setFormOpen(true)
  }

  const handleEdit = (device: Device) => {
    setEditingDevice(device)
    setFormOpen(true)
  }

  const handleDeleteClick = (device: Device) => {
    setDeviceToDelete(device)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (deviceToDelete) {
      await deleteDevice(deviceToDelete.id)
      setDeleteDialogOpen(false)
      setDeviceToDelete(null)
    }
  }

  const handleFormSubmit = async (data: DeviceCreate | DeviceUpdate) => {
    if (editingDevice) {
      await updateDevice(editingDevice.id, data as DeviceUpdate)
    } else {
      await createDevice(data as DeviceCreate)
    }
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
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
                  <BreadcrumbPage>Devices</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
            <div className="ml-auto">
              <HealthStatus />
            </div>
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <CardTitle className="text-headline-2">Device Inventory</CardTitle>
              <Button onClick={handleAdd}>
                <Plus className="mr-2 h-4 w-4" />
                Add Device
              </Button>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-muted-foreground py-8 text-center">Loading...</div>
              ) : error ? (
                <div className="py-8 text-center text-red-500">{error}</div>
              ) : (
                <DevicesTable devices={devices} onEdit={handleEdit} onDelete={handleDeleteClick} />
              )}
            </CardContent>
          </Card>
        </div>

        <DeviceFormDialog
          open={formOpen}
          onOpenChange={setFormOpen}
          device={editingDevice}
          onSubmit={handleFormSubmit}
        />

        <DeleteConfirmation
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          title="Delete Device"
          onConfirm={handleDeleteConfirm}
        >
          Are you sure you want to delete {deviceToDelete?.model} ({deviceToDelete?.imei})? This
          action cannot be undone.
        </DeleteConfirmation>
      </SidebarInset>
    </SidebarProvider>
  )
}
