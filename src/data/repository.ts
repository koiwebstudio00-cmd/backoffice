import type { Enums } from '../lib/database.types'
import { supabase } from '../lib/supabase'

export type ClientStatus = Enums<'client_status'>
export type ProjectStatus = Enums<'project_status'>
export type TaskStatus = Enums<'task_status'>
export type Currency = 'ARS' | 'USD'

export interface ClientRecord {
  id: string
  name: string
  company: string | null
  email: string | null
  phone: string | null
  notes: string | null
  status: ClientStatus
  projectsCount: number
  updatedAt: string
}

export interface TaskRecord {
  id: string
  projectId: string
  title: string
  status: TaskStatus
  dueDate: string | null
  position: number
}

export interface ProjectRecord {
  id: string
  clientId: string
  clientName: string
  name: string
  type: string
  status: ProjectStatus
  startDate: string | null
  deadline: string | null
  budget: number | null
  currency: Currency | null
  progress: number
  tasks: TaskRecord[]
  updatedAt: string
}

interface RawClient {
  id: string
  name: string
  company: string | null
  email: string | null
  phone: string | null
  notes: string | null
  status: ClientStatus
  updated_at: string
  projects: { id: string }[]
}

interface RawProject {
  id: string
  client_id: string
  name: string
  type: string
  status: ProjectStatus
  start_date: string | null
  deadline: string | null
  updated_at: string
  clients: { name: string; company: string | null } | null
  project_financials: { budget: number; currency: string } | null
  tasks: {
    id: string
    project_id: string
    title: string
    status: TaskStatus
    due_date: string | null
    position: number
  }[]
}

export interface CreateClientInput {
  name: string
  company?: string
  email?: string
  phone?: string
  notes?: string
  status: ClientStatus
}

export interface CreateProjectInput {
  clientId: string
  name: string
  type: string
  status: ProjectStatus
  startDate?: string
  deadline?: string
  budget: number
  currency: Currency
}

export interface CreateTaskInput {
  projectId: string
  title: string
  status: TaskStatus
  dueDate?: string
}

function getClient() {
  if (!supabase) throw new Error('Supabase no está configurado.')
  return supabase
}

function optionalText(value?: string): string | null {
  const normalized = value?.trim()
  return normalized ? normalized : null
}

export async function listClients(): Promise<ClientRecord[]> {
  const { data, error } = await getClient()
    .from('clients')
    .select('id, name, company, email, phone, notes, status, updated_at, projects(id)')
    .order('updated_at', { ascending: false })
    .overrideTypes<RawClient[], { merge: false }>()

  if (error) throw error
  return data.map((client) => ({
    id: client.id,
    name: client.name,
    company: client.company,
    email: client.email,
    phone: client.phone,
    notes: client.notes,
    status: client.status,
    projectsCount: client.projects.length,
    updatedAt: client.updated_at,
  }))
}

export async function createClient(input: CreateClientInput): Promise<void> {
  const { error } = await getClient().from('clients').insert({
    name: input.name.trim(),
    company: optionalText(input.company),
    email: optionalText(input.email),
    phone: optionalText(input.phone),
    notes: optionalText(input.notes),
    status: input.status,
  })

  if (error) throw error
}

export async function listProjects(): Promise<ProjectRecord[]> {
  const { data, error } = await getClient()
    .from('projects')
    .select(`
      id,
      client_id,
      name,
      type,
      status,
      start_date,
      deadline,
      updated_at,
      clients(name, company),
      project_financials(budget, currency),
      tasks(id, project_id, title, status, due_date, position)
    `)
    .order('updated_at', { ascending: false })
    .overrideTypes<RawProject[], { merge: false }>()

  if (error) throw error
  return data.map((project) => {
    const tasks = project.tasks
      .map((task) => ({
        id: task.id,
        projectId: task.project_id,
        title: task.title,
        status: task.status,
        dueDate: task.due_date,
        position: task.position,
      }))
      .sort((a, b) => a.position - b.position)
    const completedTasks = tasks.filter((task) => task.status === 'done').length

    return {
      id: project.id,
      clientId: project.client_id,
      clientName: project.clients?.company || project.clients?.name || 'Cliente',
      name: project.name,
      type: project.type,
      status: project.status,
      startDate: project.start_date,
      deadline: project.deadline,
      budget: project.project_financials?.budget ?? null,
      currency: isCurrency(project.project_financials?.currency)
        ? project.project_financials.currency
        : null,
      progress: tasks.length === 0 ? 0 : Math.round((completedTasks / tasks.length) * 100),
      tasks,
      updatedAt: project.updated_at,
    }
  })
}

function isCurrency(value: string | undefined): value is Currency {
  return value === 'ARS' || value === 'USD'
}

export async function createProject(input: CreateProjectInput): Promise<void> {
  const client = getClient()
  const { data: project, error: projectError } = await client
    .from('projects')
    .insert({
      client_id: input.clientId,
      name: input.name.trim(),
      type: input.type.trim(),
      status: input.status,
      start_date: optionalText(input.startDate),
      deadline: optionalText(input.deadline),
    })
    .select('id')
    .single()

  if (projectError) throw projectError

  const { error: financialError } = await client.from('project_financials').insert({
    project_id: project.id,
    budget: input.budget,
    currency: input.currency,
  })

  if (financialError) {
    await client.from('projects').delete().eq('id', project.id)
    throw financialError
  }
}

export async function createTask(input: CreateTaskInput): Promise<void> {
  const { error } = await getClient().from('tasks').insert({
    project_id: input.projectId,
    title: input.title.trim(),
    status: input.status,
    due_date: optionalText(input.dueDate),
  })

  if (error) throw error
}

export async function updateTaskStatus(taskId: string, status: TaskStatus): Promise<void> {
  const { error } = await getClient().from('tasks').update({ status }).eq('id', taskId)
  if (error) throw error
}
