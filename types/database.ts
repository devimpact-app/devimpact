// types/database.ts

export interface User {
  id: string;
  email: string;
  full_name: string | null;
  first_name: string | null;
  last_name: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface IntegrationToken {
  id: string;
  user_id: string;
  provider: "github" | "google";
  access_token: string;
  refresh_token: string | null;
  expires_at: Date | null;
  scopes: string[] | null;
  metadata: Object | null;
  created_at: Date;
  updated_at: Date;
}
