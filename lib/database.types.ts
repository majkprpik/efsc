export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      chat_messages: {
        Row: {
          author_id: string | null
          author_name: string | null
          content: string
          created_at: string
          entity_id: string | null
          entity_kind: string
          id: string
          role: string
        }
        Insert: {
          author_id?: string | null
          author_name?: string | null
          content: string
          created_at?: string
          entity_id?: string | null
          entity_kind: string
          id?: string
          role: string
        }
        Update: {
          author_id?: string | null
          author_name?: string | null
          content?: string
          created_at?: string
          entity_id?: string | null
          entity_kind?: string
          id?: string
          role?: string
        }
        Relationships: []
      }
      document_text: {
        Row: {
          char_count: number
          content: string
          doc_id: string
          doc_kind: string
          extracted_at: string
          id: string
        }
        Insert: {
          char_count?: number
          content?: string
          doc_id: string
          doc_kind: string
          extracted_at?: string
          id?: string
        }
        Update: {
          char_count?: number
          content?: string
          doc_id?: string
          doc_kind?: string
          extracted_at?: string
          id?: string
        }
        Relationships: []
      }
      client_notes: {
        Row: {
          author: string
          client_id: string
          created_at: string
          id: string
          text: string
          ts_label: string | null
        }
        Insert: {
          author?: string
          client_id: string
          created_at?: string
          id?: string
          text: string
          ts_label?: string | null
        }
        Update: {
          author?: string
          client_id?: string
          created_at?: string
          id?: string
          text?: string
          ts_label?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_notes_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          contact: string | null
          created_at: string
          email: string | null
          folder_path: string
          id: string
          naziv: string
          phone: string | null
          saz: string | null
          status: Database["public"]["Enums"]["client_status"]
          submitted_at: string | null
          tags: string[]
          unio_id: string | null
          unio_name: string | null
          zadnji_kontakt: string | null
        }
        Insert: {
          contact?: string | null
          created_at?: string
          email?: string | null
          folder_path?: string
          id?: string
          naziv: string
          phone?: string | null
          saz?: string | null
          status?: Database["public"]["Enums"]["client_status"]
          submitted_at?: string | null
          tags?: string[]
          unio_id?: string | null
          unio_name?: string | null
          zadnji_kontakt?: string | null
        }
        Update: {
          contact?: string | null
          created_at?: string
          email?: string | null
          folder_path?: string
          id?: string
          naziv?: string
          phone?: string | null
          saz?: string | null
          status?: Database["public"]["Enums"]["client_status"]
          submitted_at?: string | null
          tags?: string[]
          unio_id?: string | null
          unio_name?: string | null
          zadnji_kontakt?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clients_unio_id_fkey"
            columns: ["unio_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      deadlines: {
        Row: {
          created_at: string
          datum: string
          id: string
          natjecaj_id: string | null
          project_id: string | null
          text: string
        }
        Insert: {
          created_at?: string
          datum: string
          id?: string
          natjecaj_id?: string | null
          project_id?: string | null
          text: string
        }
        Update: {
          created_at?: string
          datum?: string
          id?: string
          natjecaj_id?: string | null
          project_id?: string | null
          text?: string
        }
        Relationships: []
      }
      finances: {
        Row: {
          amount: number
          client_id: string | null
          created_at: string
          datum: string
          descr: string
          id: string
          status: string
          type: Database["public"]["Enums"]["fin_type"]
        }
        Insert: {
          amount?: number
          client_id?: string | null
          created_at?: string
          datum?: string
          descr: string
          id?: string
          status?: string
          type?: Database["public"]["Enums"]["fin_type"]
        }
        Update: {
          amount?: number
          client_id?: string | null
          created_at?: string
          datum?: string
          descr?: string
          id?: string
          status?: string
          type?: Database["public"]["Enums"]["fin_type"]
        }
        Relationships: [
          {
            foreignKeyName: "finances_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      natjecaj_docs: {
        Row: {
          created_at: string
          filename: string
          id: string
          natjecaj_id: string
          storage_path: string | null
        }
        Insert: {
          created_at?: string
          filename: string
          id?: string
          natjecaj_id: string
          storage_path?: string | null
        }
        Update: {
          created_at?: string
          filename?: string
          id?: string
          natjecaj_id?: string
          storage_path?: string | null
        }
        Relationships: []
      }
      natjecaji: {
        Row: {
          created_at: string
          folder_path: string
          id: string
          iznos: string | null
          nat_folder_path: string
          naziv: string
          rok: string | null
          status: Database["public"]["Enums"]["natjecaj_status"]
          sufinanciranje: string | null
          tags: string[]
          tijelo: string | null
        }
        Insert: {
          created_at?: string
          folder_path?: string
          id?: string
          iznos?: string | null
          nat_folder_path?: string
          naziv: string
          rok?: string | null
          status?: Database["public"]["Enums"]["natjecaj_status"]
          sufinanciranje?: string | null
          tags?: string[]
          tijelo?: string | null
        }
        Update: {
          created_at?: string
          folder_path?: string
          id?: string
          iznos?: string | null
          nat_folder_path?: string
          naziv?: string
          rok?: string | null
          status?: Database["public"]["Enums"]["natjecaj_status"]
          sufinanciranje?: string | null
          tags?: string[]
          tijelo?: string | null
        }
        Relationships: []
      }
      portal_requests: {
        Row: {
          ai_note: string | null
          ai_status: string | null
          client_id: string
          created_at: string
          description: string | null
          id: string
          name: string
          original_name: string | null
          project_id: string | null
          required: boolean
          sort: number
          storage_path: string | null
          uploaded: boolean
          uploaded_at: string | null
        }
        Insert: {
          ai_note?: string | null
          ai_status?: string | null
          client_id: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
          original_name?: string | null
          project_id?: string | null
          required?: boolean
          sort?: number
          storage_path?: string | null
          uploaded?: boolean
          uploaded_at?: string | null
        }
        Update: {
          ai_note?: string | null
          ai_status?: string | null
          client_id?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          original_name?: string | null
          project_id?: string | null
          required?: boolean
          sort?: number
          storage_path?: string | null
          uploaded?: boolean
          uploaded_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "portal_requests_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portal_requests_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          client_id: string | null
          created_at: string
          email: string
          id: string
          initials: string | null
          name: string
          role: string
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          email?: string
          id: string
          initials?: string | null
          name?: string
          role?: string
        }
        Update: {
          client_id?: string | null
          created_at?: string
          email?: string
          id?: string
          initials?: string | null
          name?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      project_docs: {
        Row: {
          created_at: string
          id: string
          name: string
          note: string | null
          project_id: string
          sort: number
          storage_path: string | null
          uploaded: boolean
          uploaded_at: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          note?: string | null
          project_id: string
          sort?: number
          storage_path?: string | null
          uploaded?: boolean
          uploaded_at?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          note?: string | null
          project_id?: string
          sort?: number
          storage_path?: string | null
          uploaded?: boolean
          uploaded_at?: string | null
        }
        Relationships: []
      }
      projects: {
        Row: {
          client_id: string | null
          color: string
          created_at: string
          folder_path: string
          id: string
          natjecaj_id: string | null
          naziv: string
          progress: number
          rok: string | null
          status: Database["public"]["Enums"]["project_status"]
          value: string | null
        }
        Insert: {
          client_id?: string | null
          color?: string
          created_at?: string
          folder_path?: string
          id?: string
          natjecaj_id?: string | null
          naziv: string
          progress?: number
          rok?: string | null
          status?: Database["public"]["Enums"]["project_status"]
          value?: string | null
        }
        Update: {
          client_id?: string | null
          color?: string
          created_at?: string
          folder_path?: string
          id?: string
          natjecaj_id?: string | null
          naziv?: string
          progress?: number
          rok?: string | null
          status?: Database["public"]["Enums"]["project_status"]
          value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "projects_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_natjecaj_id_fkey"
            columns: ["natjecaj_id"]
            isOneToOne: false
            referencedRelation: "natjecaji"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          assignee_id: string | null
          assignee_name: string | null
          created_at: string
          due: string | null
          id: string
          priority: Database["public"]["Enums"]["task_priority"]
          project_id: string | null
          status: Database["public"]["Enums"]["task_status"]
          title: string
        }
        Insert: {
          assignee_id?: string | null
          assignee_name?: string | null
          created_at?: string
          due?: string | null
          id?: string
          priority?: Database["public"]["Enums"]["task_priority"]
          project_id?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          title: string
        }
        Update: {
          assignee_id?: string | null
          assignee_name?: string | null
          created_at?: string
          due?: string | null
          id?: string
          priority?: Database["public"]["Enums"]["task_priority"]
          project_id?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_assignee_id_fkey"
            columns: ["assignee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: { [_ in never]: never }
    Functions: { [_ in never]: never }
    Enums: {
      client_status: "active" | "inactive" | "potencijalni"
      deadline_urg: "urg" | "warn" | "ok"
      fin_type: "inc" | "exp"
      natjecaj_status: "aktivan" | "zatvoren" | "arhiva"
      project_status: "Aktivan" | "U pripremi" | "Kasni" | "Završen"
      task_priority: "h" | "m" | "l"
      task_status: "todo" | "doing" | "done"
    }
    CompositeTypes: { [_ in never]: never }
  }
}

type PublicSchema = Database["public"]

export type Tables<T extends keyof PublicSchema["Tables"]> =
  PublicSchema["Tables"][T]["Row"]
export type TablesInsert<T extends keyof PublicSchema["Tables"]> =
  PublicSchema["Tables"][T]["Insert"]
export type TablesUpdate<T extends keyof PublicSchema["Tables"]> =
  PublicSchema["Tables"][T]["Update"]
export type Enums<T extends keyof PublicSchema["Enums"]> =
  PublicSchema["Enums"][T]
