export interface UserPublic {
  id: number;
  email: string;
  full_name?: string | null;
  avatar_url?: string | null;
  role?: string | null;
}

export interface TokenResponse {
  token: string;
  token_type: string;
  user_id: number;
  email: string;
  full_name?: string | null;
  role?: string | null;
}

