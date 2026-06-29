export type Database = {
  public: {
    Tables: {
      clients: {
        Row: {
          company: string | null
          created_at: string
          created_by: string
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          status: Database['public']['Enums']['client_status']
          updated_at: string
        }
        Insert: {
          company?: string | null
          created_at?: string
          created_by?: string
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          status?: Database['public']['Enums']['client_status']
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['clients']['Insert']>
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string
          id: string
          role: Database['public']['Enums']['team_role']
          updated_at: string
        }
        Insert: {
          created_at?: string
          full_name: string
          id: string
          role?: Database['public']['Enums']['team_role']
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>
        Relationships: []
      }
      project_financials: {
        Row: {
          budget: number
          created_at: string
          currency: string
          project_id: string
          updated_at: string
        }
        Insert: {
          budget: number
          created_at?: string
          currency: string
          project_id: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['project_financials']['Insert']>
        Relationships: [
          {
            foreignKeyName: 'project_financials_project_id_fkey'
            columns: ['project_id']
            isOneToOne: true
            referencedRelation: 'projects'
            referencedColumns: ['id']
          },
        ]
      }
      projects: {
        Row: {
          client_id: string
          created_at: string
          created_by: string
          deadline: string | null
          id: string
          name: string
          start_date: string | null
          status: Database['public']['Enums']['project_status']
          type: string
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          created_by?: string
          deadline?: string | null
          id?: string
          name: string
          start_date?: string | null
          status?: Database['public']['Enums']['project_status']
          type: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['projects']['Insert']>
        Relationships: [
          {
            foreignKeyName: 'projects_client_id_fkey'
            columns: ['client_id']
            isOneToOne: false
            referencedRelation: 'clients'
            referencedColumns: ['id']
          },
        ]
      }
      tasks: {
        Row: {
          created_at: string
          created_by: string
          due_date: string | null
          id: string
          position: number
          project_id: string
          status: Database['public']['Enums']['task_status']
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string
          due_date?: string | null
          id?: string
          position?: number
          project_id: string
          status?: Database['public']['Enums']['task_status']
          title: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['tasks']['Insert']>
        Relationships: [
          {
            foreignKeyName: 'tasks_project_id_fkey'
            columns: ['project_id']
            isOneToOne: false
            referencedRelation: 'projects'
            referencedColumns: ['id']
          },
        ]
      }
    }
    Views: {
      project_progress: {
        Row: {
          completed_tasks: number | null
          progress_percentage: number | null
          project_id: string | null
          total_tasks: number | null
        }
        Relationships: []
      }
    }
    Functions: Record<string, never>
    Enums: {
      client_status: 'lead' | 'active' | 'paused' | 'closed'
      project_status: 'active' | 'paused' | 'done'
      task_status: 'todo' | 'doing' | 'review' | 'done'
      team_role: 'owner' | 'member'
    }
    CompositeTypes: Record<string, never>
  }
}

export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row']

export type Enums<T extends keyof Database['public']['Enums']> =
  Database['public']['Enums'][T]
