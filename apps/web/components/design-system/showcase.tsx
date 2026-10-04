"use client"

import { useEffect, useState } from "react"
import { LuMoon, LuSun } from "react-icons/lu"

import { StatusBadge, opsStatuses } from "@/components/status-badge"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

const priorities = [
  { label: "Standard", value: "standard" },
  { label: "Urgent", value: "urgent" },
]

const swatches = [
  ["Background", "bg-background text-foreground"],
  ["Card", "bg-card text-card-foreground"],
  ["Primary", "bg-primary text-primary-foreground"],
  ["Secondary", "bg-secondary text-secondary-foreground"],
  ["Muted", "bg-muted text-muted-foreground"],
  ["Accent", "bg-accent text-accent-foreground"],
  ["Success", "bg-success text-success-foreground"],
  ["Warning", "bg-warning text-warning-foreground"],
  ["Info", "bg-info text-info-foreground"],
  ["Destructive", "bg-destructive text-destructive-foreground"],
] as const

export function DesignSystemShowcase() {
  const [dark, setDark] = useState(false)

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark)
    return () => {
      document.documentElement.classList.remove("dark")
    }
  }, [dark])

  return (
    <main className="min-h-svh bg-background text-foreground">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-8 sm:px-6">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium text-foreground-secondary">
              OpsPilot
            </p>
            <h1 className="text-3xl font-semibold tracking-tight">
              Design system
            </h1>
            <p className="max-w-2xl text-sm text-muted-foreground">
              Semantic tokens, shadcn components, and field-service statuses.
            </p>
          </div>
          <Button
            variant="outline"
            aria-pressed={dark}
            onClick={() => setDark((value) => !value)}
          >
            {dark ? <LuSun /> : <LuMoon />}
            {dark ? "Light theme" : "Dark theme"}
          </Button>
        </header>

        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-medium">Color</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            {swatches.map(([name, className]) => (
              <div
                key={name}
                className={`${className} rounded-lg border border-border px-3 py-4 text-sm font-medium`}
              >
                {name}
              </div>
            ))}
          </div>
          <p className="text-sm text-foreground-secondary">
            Secondary text sits under the page foreground and above muted text.
          </p>
        </section>

        <Card>
          <CardHeader>
            <CardTitle>Controls</CardTitle>
            <CardDescription>
              Buttons, fields, and badges use the shared semantic tokens.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-6">
            <div className="flex flex-wrap gap-2">
              <Button>Primary</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="destructive">Destructive</Button>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="flex flex-col gap-2 text-sm font-medium" htmlFor="job-name">
                Job name
                <Input id="job-name" placeholder="Boiler service" />
              </label>
              <div className="flex flex-col gap-2 text-sm font-medium">
                <span id="priority-label">Priority</span>
                <Select defaultValue="standard" items={priorities}>
                  <SelectTrigger aria-labelledby="priority-label" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {priorities.map((priority) => (
                      <SelectItem key={priority.value} value={priority.value}>
                        {priority.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge>Primary</Badge>
              <Badge variant="secondary">Secondary</Badge>
              <Badge variant="outline">Outline</Badge>
              <Badge variant="destructive">Destructive</Badge>
            </div>
            <Dialog>
              <DialogTrigger render={<Button variant="outline" className="w-fit" />}>
                Open dialog
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Assign technician</DialogTitle>
                  <DialogDescription>
                    Confirm who should take this job.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter showCloseButton>
                  <Button>Confirm</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>

        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-medium">Status</h2>
          <div className="flex flex-wrap gap-2">
            {opsStatuses.map((status) => (
              <StatusBadge key={status} status={status} />
            ))}
          </div>
        </section>

        <Tabs defaultValue="jobs">
          <TabsList>
            <TabsTrigger value="jobs">Jobs</TabsTrigger>
            <TabsTrigger value="technicians">Technicians</TabsTrigger>
          </TabsList>
          <TabsContent value="jobs">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Job</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell>Boiler service</TableCell>
                  <TableCell>
                    <StatusBadge status="scheduled" />
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Filter change</TableCell>
                  <TableCell>
                    <StatusBadge status="in-progress" />
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Invoice 1042</TableCell>
                  <TableCell>
                    <StatusBadge status="overdue" />
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TabsContent>
          <TabsContent value="technicians">
            <div className="flex flex-wrap gap-2 pt-2">
              <StatusBadge status="available" />
              <StatusBadge status="working" />
              <StatusBadge status="offline" />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </main>
  )
}
