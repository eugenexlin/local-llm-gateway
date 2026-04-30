export interface ApiKey {
  id: string;
  name: string;
  description: string | null;
  api_key: string | null;
  created_at: string;
  user_id: string | null;
  is_active: number;
  revoked_at: string | null;
  has_metrics: boolean;
}
