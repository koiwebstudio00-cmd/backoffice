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
      credentials: {
        Row: {
          client_id: string | null
          created_at: string
          created_by: string
          id: string
          key_version: number
          notes_ciphertext: string | null
          notes_iv: string | null
          project_id: string | null
          secret_ciphertext: string
          secret_iv: string
          service_name: string
          service_url: string | null
          updated_at: string
          username: string | null
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          created_by?: string
          id?: string
          key_version?: number
          notes_ciphertext?: string | null
          notes_iv?: string | null
          project_id?: string | null
          secret_ciphertext: string
          secret_iv: string
          service_name: string
          service_url?: string | null
          updated_at?: string
          username?: string | null
        }
        Update: Partial<Database['public']['Tables']['credentials']['Insert']>
        Relationships: [
          {
            foreignKeyName: 'credentials_client_id_fkey'
            columns: ['client_id']
            isOneToOne: false
            referencedRelation: 'clients'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'credentials_project_id_fkey'
            columns: ['project_id']
            isOneToOne: false
            referencedRelation: 'projects'
            referencedColumns: ['id']
          },
        ]
      }
      credential_access_log: {
        Row: {
          accessed_at: string
          credential_id: string
          id: string
          user_id: string
        }
        Insert: {
          accessed_at?: string
          credential_id: string
          id?: string
          user_id: string
        }
        Update: Partial<Database['public']['Tables']['credential_access_log']['Insert']>
        Relationships: [
          {
            foreignKeyName: 'credential_access_log_credential_id_fkey'
            columns: ['credential_id']
            isOneToOne: false
            referencedRelation: 'credentials'
            referencedColumns: ['id']
          },
        ]
      }
      financial_movements: {
        Row: {
          amount: number
          category: string
          client_id: string | null
          concept: string
          created_at: string
          created_by: string
          currency: string
          due_date: string | null
          id: string
          notes: string | null
          occurred_on: string
          payment_method: Database['public']['Enums']['financial_payment_method'] | null
          project_id: string | null
          recurrence: Database['public']['Enums']['financial_recurrence']
          series_id: string | null
          settled_on: string | null
          status: Database['public']['Enums']['financial_movement_status']
          type: Database['public']['Enums']['financial_movement_type']
          updated_at: string
        }
        Insert: {
          amount: number
          category: string
          client_id?: string | null
          concept: string
          created_at?: string
          created_by?: string
          currency: string
          due_date?: string | null
          id?: string
          notes?: string | null
          occurred_on?: string
          payment_method?: Database['public']['Enums']['financial_payment_method'] | null
          project_id?: string | null
          recurrence?: Database['public']['Enums']['financial_recurrence']
          series_id?: string | null
          settled_on?: string | null
          status?: Database['public']['Enums']['financial_movement_status']
          type: Database['public']['Enums']['financial_movement_type']
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['financial_movements']['Insert']>
        Relationships: [
          {
            foreignKeyName: 'financial_movements_client_id_fkey'
            columns: ['client_id']
            isOneToOne: false
            referencedRelation: 'clients'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'financial_movements_project_id_fkey'
            columns: ['project_id']
            isOneToOne: false
            referencedRelation: 'projects'
            referencedColumns: ['id']
          },
        ]
      }
      meetings: {
        Row: {
          created_at: string
          created_by: string
          ends_at: string | null
          id: string
          location: string | null
          notes: string | null
          starts_at: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string
          ends_at?: string | null
          id?: string
          location?: string | null
          notes?: string | null
          starts_at: string
          title: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['meetings']['Insert']>
        Relationships: []
      }
      meeting_projects: {
        Row: {
          meeting_id: string
          project_id: string
        }
        Insert: {
          meeting_id: string
          project_id: string
        }
        Update: Partial<Database['public']['Tables']['meeting_projects']['Insert']>
        Relationships: [
          {
            foreignKeyName: 'meeting_projects_meeting_id_fkey'
            columns: ['meeting_id']
            isOneToOne: false
            referencedRelation: 'meetings'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'meeting_projects_project_id_fkey'
            columns: ['project_id']
            isOneToOne: false
            referencedRelation: 'projects'
            referencedColumns: ['id']
          },
        ]
      }
      milestones: {
        Row: {
          created_at: string
          created_by: string
          done: boolean
          due_date: string
          id: string
          position: number
          project_id: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string
          done?: boolean
          due_date: string
          id?: string
          position?: number
          project_id: string
          title: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['milestones']['Insert']>
        Relationships: [
          {
            foreignKeyName: 'milestones_project_id_fkey'
            columns: ['project_id']
            isOneToOne: false
            referencedRelation: 'projects'
            referencedColumns: ['id']
          },
        ]
      }
      notes: {
        Row: {
          body: string
          client_id: string | null
          created_at: string
          created_by: string
          id: string
          project_id: string | null
          updated_at: string
        }
        Insert: {
          body: string
          client_id?: string | null
          created_at?: string
          created_by?: string
          id?: string
          project_id?: string | null
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['notes']['Insert']>
        Relationships: [
          {
            foreignKeyName: 'notes_client_id_fkey'
            columns: ['client_id']
            isOneToOne: false
            referencedRelation: 'clients'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'notes_project_id_fkey'
            columns: ['project_id']
            isOneToOne: false
            referencedRelation: 'projects'
            referencedColumns: ['id']
          },
        ]
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
          client_id: string | null
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
          client_id?: string | null
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
      client_portal_tokens: {
        Row: {
          client_id: string
          created_at: string
          created_by: string
          id: string
          last_accessed_at: string | null
          revoked_at: string | null
          token_hash: string
        }
        Insert: {
          client_id: string
          created_at?: string
          created_by?: string
          id?: string
          last_accessed_at?: string | null
          revoked_at?: string | null
          token_hash: string
        }
        Update: Partial<Database['public']['Tables']['client_portal_tokens']['Insert']>
        Relationships: [
          {
            foreignKeyName: 'client_portal_tokens_client_id_fkey'
            columns: ['client_id']
            isOneToOne: false
            referencedRelation: 'clients'
            referencedColumns: ['id']
          },
        ]
      }
      project_env_files: {
        Row: {
          content_ciphertext: string
          content_iv: string
          created_at: string
          created_by: string
          id: string
          key_version: number
          name: string
          project_id: string
          updated_at: string
        }
        Insert: {
          content_ciphertext: string
          content_iv: string
          created_at?: string
          created_by?: string
          id?: string
          key_version?: number
          name: string
          project_id: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['project_env_files']['Insert']>
        Relationships: [
          {
            foreignKeyName: 'project_env_files_project_id_fkey'
            columns: ['project_id']
            isOneToOne: false
            referencedRelation: 'projects'
            referencedColumns: ['id']
          },
        ]
      }
      env_file_access_log: {
        Row: {
          accessed_at: string
          env_file_id: string
          id: string
          user_id: string
        }
        Insert: {
          accessed_at?: string
          env_file_id: string
          id?: string
          user_id: string
        }
        Update: Partial<Database['public']['Tables']['env_file_access_log']['Insert']>
        Relationships: [
          {
            foreignKeyName: 'env_file_access_log_env_file_id_fkey'
            columns: ['env_file_id']
            isOneToOne: false
            referencedRelation: 'project_env_files'
            referencedColumns: ['id']
          },
        ]
      }
      feature_requests: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          id: string
          status: Database['public']['Enums']['feature_request_status']
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          status?: Database['public']['Enums']['feature_request_status']
          title: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['feature_requests']['Insert']>
        Relationships: []
      }
      feature_request_comments: {
        Row: {
          body: string
          created_at: string
          created_by: string
          feature_request_id: string
          id: string
        }
        Insert: {
          body: string
          created_at?: string
          created_by?: string
          feature_request_id: string
          id?: string
        }
        Update: Partial<
          Database['public']['Tables']['feature_request_comments']['Insert']
        >
        Relationships: [
          {
            foreignKeyName: 'feature_request_comments_feature_request_id_fkey'
            columns: ['feature_request_id']
            isOneToOne: false
            referencedRelation: 'feature_requests'
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
      feature_request_status:
        | 'proposed'
        | 'accepted'
        | 'in_progress'
        | 'done'
        | 'rejected'
      financial_movement_status: 'pending' | 'settled' | 'cancelled'
      financial_payment_method: 'transfer' | 'crypto' | 'cash' | 'card' | 'other'
      financial_movement_type: 'income' | 'expense'
      financial_recurrence: 'none' | 'monthly'
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
