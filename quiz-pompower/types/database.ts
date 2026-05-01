// Tipagem mínima da Database para os clientes Supabase. Em projetos
// maiores, gerar via `supabase gen types typescript`. Para o MVP
// mantemos manual e próximo do schema da migration 001.

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          role: "admin";
          created_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          role?: "admin";
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
        Relationships: [];
      };
      respondents: {
        Row: {
          id: string;
          email: string;
          first_name: string;
          age_range:
            | "20-29"
            | "30-39"
            | "40-49"
            | "50+"
            | "nao_informado"
            | null;
          has_children:
            | "nao"
            | "parto_normal"
            | "cesarea"
            | "ambos"
            | "nao_informado"
            | null;
          status:
            | "started"
            | "block_1_completed"
            | "block_2_completed"
            | "result_delivered";
          profile_archetype:
            | "renascimento"
            | "expansao"
            | "equilibrio"
            | "dominio"
            | null;
          consent_lgpd_at: string;
          eligible_for_draw: boolean;
          draw_winner: boolean;
          utm_source: string | null;
          utm_medium: string | null;
          utm_campaign: string | null;
          user_agent: string | null;
          device_type: "mobile" | "desktop" | "tablet" | null;
          started_at: string;
          block_1_completed_at: string | null;
          block_2_completed_at: string | null;
          result_delivered_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          first_name: string;
          age_range?:
            | "20-29"
            | "30-39"
            | "40-49"
            | "50+"
            | "nao_informado"
            | null;
          has_children?:
            | "nao"
            | "parto_normal"
            | "cesarea"
            | "ambos"
            | "nao_informado"
            | null;
          status?:
            | "started"
            | "block_1_completed"
            | "block_2_completed"
            | "result_delivered";
          profile_archetype?:
            | "renascimento"
            | "expansao"
            | "equilibrio"
            | "dominio"
            | null;
          consent_lgpd_at: string;
          eligible_for_draw?: boolean;
          draw_winner?: boolean;
          utm_source?: string | null;
          utm_medium?: string | null;
          utm_campaign?: string | null;
          user_agent?: string | null;
          device_type?: "mobile" | "desktop" | "tablet" | null;
          started_at?: string;
          block_1_completed_at?: string | null;
          block_2_completed_at?: string | null;
          result_delivered_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["respondents"]["Insert"]
        >;
        Relationships: [];
      };
      answers: {
        Row: {
          id: string;
          respondent_id: string;
          question_code: string;
          block: number;
          answer_text: string | null;
          answer_choice: string | null;
          answer_choices: string[] | null;
          answer_number: number | null;
          answered_at: string;
        };
        Insert: {
          id?: string;
          respondent_id: string;
          question_code: string;
          block: number;
          answer_text?: string | null;
          answer_choice?: string | null;
          answer_choices?: string[] | null;
          answer_number?: number | null;
          answered_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["answers"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "answers_respondent_id_fkey";
            columns: ["respondent_id"];
            referencedRelation: "respondents";
            referencedColumns: ["id"];
          },
        ];
      };
      email_logs: {
        Row: {
          id: string;
          respondent_id: string | null;
          email_type: "result" | "reminder" | "draw_winner";
          resend_message_id: string | null;
          status:
            | "sent"
            | "delivered"
            | "opened"
            | "clicked"
            | "failed"
            | null;
          error_message: string | null;
          sent_at: string;
        };
        Insert: {
          id?: string;
          respondent_id?: string | null;
          email_type: "result" | "reminder" | "draw_winner";
          resend_message_id?: string | null;
          status?:
            | "sent"
            | "delivered"
            | "opened"
            | "clicked"
            | "failed"
            | null;
          error_message?: string | null;
          sent_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["email_logs"]["Insert"]
        >;
        Relationships: [];
      };
      favorited_answers: {
        Row: {
          id: string;
          answer_id: string;
          admin_user_id: string;
          note: string | null;
          favorited_at: string;
        };
        Insert: {
          id?: string;
          answer_id: string;
          admin_user_id: string;
          note?: string | null;
          favorited_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["favorited_answers"]["Insert"]
        >;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
};
