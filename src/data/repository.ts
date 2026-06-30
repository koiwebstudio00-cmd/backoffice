import type { Enums } from '../lib/database.types'
import { supabase } from '../lib/supabase'

export type ClientStatus = Enums<'client_status'>
export type ProjectStatus = Enums<'project_status'>
export type TaskStatus = Enums<'task_status'>
export type FinancialMovementStatus = Enums<'financial_movement_status'>
export type FinancialMovementType = Enums<'financial_movement_type'>
export type FinancialMovementRecurrence = Enums<'financial_recurrence'>
export type Currency = 'ARS' | 'USD' | 'USDT'

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
  createdAt: string
}

export interface MilestoneRecord {
  id: string
  projectId: string
  title: string
  dueDate: string
  done: boolean
  position: number
}

export interface CreateMilestoneInput {
  projectId: string
  title: string
  dueDate: string
}

export interface ProjectRecord {
  id: string
  clientId: string | null
  clientName: string | null
  name: string
  type: string
  status: ProjectStatus
  startDate: string | null
  deadline: string | null
  budget: number | null
  currency: Currency | null
  progress: number
  tasks: TaskRecord[]
  milestones: MilestoneRecord[]
  updatedAt: string
}

export interface FinancialMovementRecord {
  id: string
  type: FinancialMovementType
  status: FinancialMovementStatus
  concept: string
  category: string
  amount: number
  currency: Currency
  occurredOn: string
  dueDate: string | null
  settledOn: string | null
  clientId: string | null
  clientName: string | null
  projectId: string | null
  projectName: string | null
  notes: string | null
  recurrence: FinancialMovementRecurrence
  seriesId: string | null
  updatedAt: string
}

export interface FinancialClientOption {
  id: string
  name: string
}

export interface FinancialProjectOption {
  id: string
  clientId: string | null
  name: string
}

export interface ClientTaskRecord extends TaskRecord {
  projectName: string
}

export interface NoteRecord {
  id: string
  clientId: string | null
  projectId: string | null
  body: string
  authorName: string | null
  createdBy: string
  createdAt: string
  updatedAt: string
}

export interface CreateNoteInput {
  clientId?: string
  projectId?: string
  body: string
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
  client_id: string | null
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
    created_at: string
  }[]
  milestones: {
    id: string
    project_id: string
    title: string
    due_date: string
    done: boolean
    position: number
  }[]
}

interface RawFinancialMovement {
  id: string
  type: FinancialMovementType
  status: FinancialMovementStatus
  concept: string
  category: string
  amount: number
  currency: string
  occurred_on: string
  due_date: string | null
  settled_on: string | null
  client_id: string | null
  project_id: string | null
  notes: string | null
  recurrence: FinancialMovementRecurrence
  series_id: string | null
  updated_at: string
  clients: { name: string; company: string | null } | null
  projects: { name: string } | null
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
  clientId?: string
  name: string
  type: string
  status: ProjectStatus
  startDate?: string
  deadline?: string
  budget?: number
  currency?: Currency
}

export interface CreateTaskInput {
  projectId: string
  title: string
  status: TaskStatus
  dueDate?: string
}

export interface CreateFinancialMovementInput {
  type: FinancialMovementType
  status: FinancialMovementStatus
  concept: string
  category: string
  amount: number
  currency: Currency
  occurredOn: string
  dueDate?: string
  settledOn?: string
  clientId?: string
  projectId?: string
  notes?: string
  recurrence: FinancialMovementRecurrence
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

export async function getClientById(clientId: string): Promise<ClientRecord> {
  const { data, error } = await getClient()
    .from('clients')
    .select('id, name, company, email, phone, notes, status, updated_at, projects(id)')
    .eq('id', clientId)
    .single()
    .overrideTypes<RawClient, { merge: false }>()

  if (error) throw error
  return {
    id: data.id,
    name: data.name,
    company: data.company,
    email: data.email,
    phone: data.phone,
    notes: data.notes,
    status: data.status,
    projectsCount: data.projects.length,
    updatedAt: data.updated_at,
  }
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

export async function updateClient(clientId: string, input: CreateClientInput): Promise<void> {
  const { error } = await getClient()
    .from('clients')
    .update({
      name: input.name.trim(),
      company: optionalText(input.company),
      email: optionalText(input.email),
      phone: optionalText(input.phone),
      notes: optionalText(input.notes),
      status: input.status,
    })
    .eq('id', clientId)
    .select('id')
    .single()

  if (error) throw error
}

export async function deleteClient(clientId: string): Promise<void> {
  const { error } = await getClient()
    .from('clients')
    .delete()
    .eq('id', clientId)
    .select('id')
    .single()

  if (error) throw error
}

const projectSelect = `
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
  tasks(id, project_id, title, status, due_date, position, created_at),
  milestones(id, project_id, title, due_date, done, position)
`

function mapProject(project: RawProject): ProjectRecord {
  const tasks = project.tasks
    .map((task) => ({
      id: task.id,
      projectId: task.project_id,
      title: task.title,
      status: task.status,
      dueDate: task.due_date,
      position: task.position,
      createdAt: task.created_at,
    }))
    .sort((a, b) => a.position - b.position)
  const completedTasks = tasks.filter((task) => task.status === 'done').length
  const milestones = project.milestones
    .map((milestone) => ({
      id: milestone.id,
      projectId: milestone.project_id,
      title: milestone.title,
      dueDate: milestone.due_date,
      done: milestone.done,
      position: milestone.position,
    }))
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))

  return {
    id: project.id,
    clientId: project.client_id,
    clientName: project.clients?.company || project.clients?.name || null,
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
    milestones,
    updatedAt: project.updated_at,
  }
}

export async function listProjects(clientId?: string): Promise<ProjectRecord[]> {
  let query = getClient()
    .from('projects')
    .select(projectSelect)
    .order('updated_at', { ascending: false })

  if (clientId) query = query.eq('client_id', clientId)

  const { data, error } = await query.overrideTypes<RawProject[], { merge: false }>()

  if (error) throw error
  return data.map(mapProject)
}

export async function getProjectById(projectId: string): Promise<ProjectRecord> {
  const { data, error } = await getClient()
    .from('projects')
    .select(projectSelect)
    .eq('id', projectId)
    .single()
    .overrideTypes<RawProject, { merge: false }>()

  if (error) throw error
  return mapProject(data)
}

function isCurrency(value: string | undefined): value is Currency {
  return value === 'ARS' || value === 'USD' || value === 'USDT'
}

export async function createProject(input: CreateProjectInput): Promise<void> {
  const client = getClient()
  const { data: project, error: projectError } = await client
    .from('projects')
    .insert({
      client_id: input.clientId ?? null,
      name: input.name.trim(),
      type: input.type.trim(),
      status: input.status,
      start_date: optionalText(input.startDate),
      deadline: optionalText(input.deadline),
    })
    .select('id')
    .single()

  if (projectError) throw projectError

  if (input.budget === undefined || input.currency === undefined) return

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

export async function updateProject(projectId: string, input: CreateProjectInput): Promise<void> {
  const client = getClient()
  const { error: projectError } = await client
    .from('projects')
    .update({
      client_id: input.clientId ?? null,
      name: input.name.trim(),
      type: input.type.trim(),
      status: input.status,
      start_date: optionalText(input.startDate),
      deadline: optionalText(input.deadline),
    })
    .eq('id', projectId)
    .select('id')
    .single()

  if (projectError) throw projectError
  if (input.budget === undefined || input.currency === undefined) return

  const { error: financialError } = await client
    .from('project_financials')
    .upsert({
      project_id: projectId,
      budget: input.budget,
      currency: input.currency,
    }, { onConflict: 'project_id' })

  if (financialError) throw financialError
}

export async function deleteProject(projectId: string): Promise<void> {
  const { error } = await getClient()
    .from('projects')
    .delete()
    .eq('id', projectId)
    .select('id')
    .single()

  if (error) throw error
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

export async function updateTask(taskId: string, input: CreateTaskInput): Promise<void> {
  const { error } = await getClient()
    .from('tasks')
    .update({
      project_id: input.projectId,
      title: input.title.trim(),
      status: input.status,
      due_date: optionalText(input.dueDate),
    })
    .eq('id', taskId)
    .select('id')
    .single()

  if (error) throw error
}

export async function deleteTask(taskId: string): Promise<void> {
  const { error } = await getClient()
    .from('tasks')
    .delete()
    .eq('id', taskId)
    .select('id')
    .single()

  if (error) throw error
}

export async function updateTaskStatus(taskId: string, status: TaskStatus): Promise<void> {
  const { error } = await getClient()
    .from('tasks')
    .update({ status })
    .eq('id', taskId)
    .select('id')
    .single()
  if (error) throw error
}

const movementSelect = `
  id,
  type,
  status,
  concept,
  category,
  amount,
  currency,
  occurred_on,
  due_date,
  settled_on,
  client_id,
  project_id,
  notes,
  recurrence,
  series_id,
  updated_at,
  clients(name, company),
  projects(name)
`

function mapMovement(movement: RawFinancialMovement): FinancialMovementRecord {
  return {
    id: movement.id,
    type: movement.type,
    status: movement.status,
    concept: movement.concept,
    category: movement.category,
    amount: movement.amount,
    currency: isCurrency(movement.currency) ? movement.currency : 'ARS',
    occurredOn: movement.occurred_on,
    dueDate: movement.due_date,
    settledOn: movement.settled_on,
    clientId: movement.client_id,
    clientName: movement.clients?.company || movement.clients?.name || null,
    projectId: movement.project_id,
    projectName: movement.projects?.name ?? null,
    notes: movement.notes,
    recurrence: movement.recurrence,
    seriesId: movement.series_id,
    updatedAt: movement.updated_at,
  }
}

export async function listFinancialMovements(clientId?: string): Promise<FinancialMovementRecord[]> {
  let query = getClient()
    .from('financial_movements')
    .select(movementSelect)
    .order('occurred_on', { ascending: false })
    .order('created_at', { ascending: false })

  if (clientId) query = query.eq('client_id', clientId)

  const { data, error } = await query.overrideTypes<RawFinancialMovement[], { merge: false }>()

  if (error) throw error
  return data.map(mapMovement)
}

export async function listMovementsByProject(projectId: string): Promise<FinancialMovementRecord[]> {
  const { data, error } = await getClient()
    .from('financial_movements')
    .select(movementSelect)
    .eq('project_id', projectId)
    .order('occurred_on', { ascending: false })
    .order('created_at', { ascending: false })
    .overrideTypes<RawFinancialMovement[], { merge: false }>()

  if (error) throw error
  return data.map(mapMovement)
}

export async function listFinancialReferences(): Promise<{
  clients: FinancialClientOption[]
  projects: FinancialProjectOption[]
}> {
  const client = getClient()
  const [clientsResult, projectsResult] = await Promise.all([
    client.from('clients').select('id, name, company').order('name'),
    client.from('projects').select('id, client_id, name').order('name'),
  ])

  if (clientsResult.error) throw clientsResult.error
  if (projectsResult.error) throw projectsResult.error

  return {
    clients: clientsResult.data.map((item) => ({
      id: item.id,
      name: item.company || item.name,
    })),
    projects: projectsResult.data.map((item) => ({
      id: item.id,
      clientId: item.client_id,
      name: item.name,
    })),
  }
}

function financialMovementPayload(input: CreateFinancialMovementInput) {
  return {
    type: input.type,
    status: input.status,
    concept: input.concept.trim(),
    category: input.category.trim(),
    amount: input.amount,
    currency: input.currency,
    occurred_on: input.occurredOn,
    due_date: optionalText(input.dueDate),
    settled_on: input.status === 'settled' ? optionalText(input.settledOn) : null,
    client_id: optionalText(input.clientId),
    project_id: optionalText(input.projectId),
    notes: optionalText(input.notes),
    recurrence: input.recurrence,
  }
}

export async function createFinancialMovement(input: CreateFinancialMovementInput): Promise<void> {
  const { error } = await getClient()
    .from('financial_movements')
    .insert(financialMovementPayload(input))

  if (error) throw error
}

export async function updateFinancialMovement(movementId: string, input: CreateFinancialMovementInput): Promise<void> {
  const { error } = await getClient()
    .from('financial_movements')
    .update(financialMovementPayload(input))
    .eq('id', movementId)
    .select('id')
    .single()

  if (error) throw error
}

export async function deleteFinancialMovement(movementId: string): Promise<void> {
  const { error } = await getClient()
    .from('financial_movements')
    .delete()
    .eq('id', movementId)
    .select('id')
    .single()

  if (error) throw error
}

interface RawClientTask {
  id: string
  project_id: string
  title: string
  status: TaskStatus
  due_date: string | null
  position: number
  created_at: string
  projects: { name: string } | null
}

export async function listTasksByClient(clientId: string): Promise<ClientTaskRecord[]> {
  const { data, error } = await getClient()
    .from('tasks')
    .select('id, project_id, title, status, due_date, position, created_at, projects!inner(name, client_id)')
    .eq('projects.client_id', clientId)
    .order('position', { ascending: true })
    .overrideTypes<RawClientTask[], { merge: false }>()

  if (error) throw error
  return data.map((task) => ({
    id: task.id,
    projectId: task.project_id,
    title: task.title,
    status: task.status,
    dueDate: task.due_date,
    position: task.position,
    createdAt: task.created_at,
    projectName: task.projects?.name ?? 'Proyecto',
  }))
}

interface RawNote {
  id: string
  client_id: string | null
  project_id: string | null
  body: string
  created_by: string
  created_at: string
  updated_at: string
}

export async function listNotes(clientId?: string, projectId?: string): Promise<NoteRecord[]> {
  const client = getClient()
  let notesQuery = client
    .from('notes')
    .select('id, client_id, project_id, body, created_by, created_at, updated_at')
    .order('created_at', { ascending: false })

  if (clientId) notesQuery = notesQuery.eq('client_id', clientId)
  if (projectId) notesQuery = notesQuery.eq('project_id', projectId)

  const [notesResult, profilesResult] = await Promise.all([
    notesQuery.overrideTypes<RawNote[], { merge: false }>(),
    client.from('profiles').select('id, full_name'),
  ])

  if (notesResult.error) throw notesResult.error
  if (profilesResult.error) throw profilesResult.error

  const authorById = new Map(profilesResult.data.map((profile) => [profile.id, profile.full_name]))

  return notesResult.data.map((note) => ({
    id: note.id,
    clientId: note.client_id,
    projectId: note.project_id,
    body: note.body,
    authorName: authorById.get(note.created_by) ?? null,
    createdBy: note.created_by,
    createdAt: note.created_at,
    updatedAt: note.updated_at,
  }))
}

export async function createNote(input: CreateNoteInput): Promise<void> {
  const { error } = await getClient().from('notes').insert({
    client_id: input.clientId ?? null,
    project_id: optionalText(input.projectId),
    body: input.body.trim(),
  })

  if (error) throw error
}

export async function updateNote(noteId: string, body: string): Promise<void> {
  const { error } = await getClient()
    .from('notes')
    .update({ body: body.trim() })
    .eq('id', noteId)
    .select('id')
    .single()

  if (error) throw error
}

export async function deleteNote(noteId: string): Promise<void> {
  const { error } = await getClient()
    .from('notes')
    .delete()
    .eq('id', noteId)
    .select('id')
    .single()

  if (error) throw error
}

export async function createMilestone(input: CreateMilestoneInput): Promise<void> {
  const { error } = await getClient().from('milestones').insert({
    project_id: input.projectId,
    title: input.title.trim(),
    due_date: input.dueDate,
  })

  if (error) throw error
}

export async function updateMilestone(milestoneId: string, input: { title: string; dueDate: string }): Promise<void> {
  const { error } = await getClient()
    .from('milestones')
    .update({ title: input.title.trim(), due_date: input.dueDate })
    .eq('id', milestoneId)
    .select('id')
    .single()

  if (error) throw error
}

export async function setMilestoneDone(milestoneId: string, done: boolean): Promise<void> {
  const { error } = await getClient()
    .from('milestones')
    .update({ done })
    .eq('id', milestoneId)
    .select('id')
    .single()

  if (error) throw error
}

export async function deleteMilestone(milestoneId: string): Promise<void> {
  const { error } = await getClient()
    .from('milestones')
    .delete()
    .eq('id', milestoneId)
    .select('id')
    .single()

  if (error) throw error
}

export interface MeetingRecord {
  id: string
  title: string
  startsAt: string
  endsAt: string | null
  location: string | null
  notes: string | null
  projectIds: string[]
  projectNames: string[]
  createdBy: string
}

export interface CreateMeetingInput {
  title: string
  startsAt: string
  endsAt?: string | null
  location?: string
  notes?: string
  projectIds: string[]
}

interface RawMeeting {
  id: string
  title: string
  starts_at: string
  ends_at: string | null
  location: string | null
  notes: string | null
  created_by: string
  meeting_projects: { project_id: string; projects: { name: string } | null }[]
}

export async function listMeetings(): Promise<MeetingRecord[]> {
  const { data, error } = await getClient()
    .from('meetings')
    .select('id, title, starts_at, ends_at, location, notes, created_by, meeting_projects(project_id, projects(name))')
    .order('starts_at', { ascending: true })
    .overrideTypes<RawMeeting[], { merge: false }>()

  if (error) throw error
  return data.map((meeting) => ({
    id: meeting.id,
    title: meeting.title,
    startsAt: meeting.starts_at,
    endsAt: meeting.ends_at,
    location: meeting.location,
    notes: meeting.notes,
    projectIds: meeting.meeting_projects.map((link) => link.project_id),
    projectNames: meeting.meeting_projects.map((link) => link.projects?.name ?? 'Proyecto'),
    createdBy: meeting.created_by,
  }))
}

async function replaceMeetingProjects(meetingId: string, projectIds: string[]): Promise<void> {
  const client = getClient()
  const { error: deleteError } = await client.from('meeting_projects').delete().eq('meeting_id', meetingId)
  if (deleteError) throw deleteError
  if (projectIds.length === 0) return
  const { error: insertError } = await client
    .from('meeting_projects')
    .insert(projectIds.map((projectId) => ({ meeting_id: meetingId, project_id: projectId })))
  if (insertError) throw insertError
}

export async function createMeeting(input: CreateMeetingInput): Promise<void> {
  const client = getClient()
  const { data, error } = await client
    .from('meetings')
    .insert({
      title: input.title.trim(),
      starts_at: input.startsAt,
      ends_at: input.endsAt ?? null,
      location: optionalText(input.location),
      notes: optionalText(input.notes),
    })
    .select('id')
    .single()

  if (error) throw error
  if (input.projectIds.length > 0) await replaceMeetingProjects(data.id, input.projectIds)
}

export async function updateMeeting(meetingId: string, input: CreateMeetingInput): Promise<void> {
  const { error } = await getClient()
    .from('meetings')
    .update({
      title: input.title.trim(),
      starts_at: input.startsAt,
      ends_at: input.endsAt ?? null,
      location: optionalText(input.location),
      notes: optionalText(input.notes),
    })
    .eq('id', meetingId)
    .select('id')
    .single()

  if (error) throw error
  await replaceMeetingProjects(meetingId, input.projectIds)
}

export async function deleteMeeting(meetingId: string): Promise<void> {
  const { error } = await getClient()
    .from('meetings')
    .delete()
    .eq('id', meetingId)
    .select('id')
    .single()

  if (error) throw error
}

export interface CredentialRecord {
  id: string
  clientId: string | null
  clientName: string | null
  projectId: string | null
  projectName: string | null
  serviceName: string
  serviceUrl: string | null
  username: string | null
  hasNotes: boolean
  updatedAt: string
}

export interface SaveCredentialInput {
  id?: string
  clientId?: string
  projectId?: string
  serviceName: string
  serviceUrl?: string
  username?: string
  secret?: string
  notes?: string
}

interface RawCredential {
  id: string
  client_id: string | null
  project_id: string | null
  service_name: string
  service_url: string | null
  username: string | null
  notes_ciphertext: string | null
  updated_at: string
  clients: { name: string; company: string | null } | null
  projects: { name: string } | null
}

const credentialSelect = 'id, client_id, project_id, service_name, service_url, username, notes_ciphertext, updated_at, clients(name, company), projects(name)'

function mapCredential(credential: RawCredential): CredentialRecord {
  return {
    id: credential.id,
    clientId: credential.client_id,
    clientName: credential.clients?.company || credential.clients?.name || null,
    projectId: credential.project_id,
    projectName: credential.projects?.name ?? null,
    serviceName: credential.service_name,
    serviceUrl: credential.service_url,
    username: credential.username,
    hasNotes: Boolean(credential.notes_ciphertext),
    updatedAt: credential.updated_at,
  }
}

async function invokeFunction<T>(name: string, body: Record<string, unknown>): Promise<T> {
  const { data, error } = await getClient().functions.invoke<T>(name, { body })
  if (error) {
    const context = (error as { context?: unknown }).context
    if (context instanceof Response) {
      const parsed = await context.json().catch(() => null) as { error?: string } | null
      if (parsed?.error) throw new Error(parsed.error)
    }
    throw error
  }
  return data as T
}

export async function listCredentials(clientId?: string, projectId?: string): Promise<CredentialRecord[]> {
  let query = getClient()
    .from('credentials')
    .select(credentialSelect)
    .order('service_name', { ascending: true })

  if (clientId) query = query.eq('client_id', clientId)
  if (projectId) query = query.eq('project_id', projectId)

  const { data, error } = await query.overrideTypes<RawCredential[], { merge: false }>()

  if (error) throw error
  return data.map(mapCredential)
}

export async function listAllCredentials(): Promise<CredentialRecord[]> {
  const { data, error } = await getClient()
    .from('credentials')
    .select(credentialSelect)
    .order('service_name', { ascending: true })
    .overrideTypes<RawCredential[], { merge: false }>()

  if (error) throw error
  return data.map(mapCredential)
}

export async function saveCredential(input: SaveCredentialInput): Promise<void> {
  await invokeFunction('save-credential', { ...input })
}

export async function revealCredential(credentialId: string): Promise<{ secret: string; notes: string | null }> {
  return invokeFunction('reveal-credential', { id: credentialId })
}

export async function deleteCredential(credentialId: string): Promise<void> {
  const { error } = await getClient()
    .from('credentials')
    .delete()
    .eq('id', credentialId)
    .select('id')
    .single()

  if (error) throw error
}
