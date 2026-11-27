export type UserRole = "participant" | "admin";

export type RaffleStatus =
  | "draft"
  | "published"
  | "live"
  | "full"
  | "locked"
  | "running"
  | "completed"
  | "archived"
  | "cancelled";

export type PaymentStatus = "pending" | "approved" | "rejected" | "consumed";

export type EntryStatus = "alive" | "eliminated" | "winner";

export type PayoutStatus = "pending" | "processing" | "paid";

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export interface RaffleRound {
  id: string;
  round_code: string;
  name: string;
  description: string | null;
  entry_fee_pesewas: number;
  participant_capacity: number;
  num_stages: number;
  gross_revenue_pesewas: number;
  owner_profit_pesewas: number;
  prize_pool_pesewas: number;
  allocation_method: "auto_50_30_20" | "custom";
  first_prize_pesewas: number;
  second_prize_pesewas: number;
  third_prize_pesewas: number;
  momo_instructions: string | null;
  cover_image_url: string | null;
  opens_at: string | null;
  closes_at: string | null;
  status: RaffleStatus;
  current_stage: number;
  confirmed_entries_count: number;
  financials_frozen_at: string | null;
  seed_commitment: string | null;
  snapshot_hash: string | null;
  algorithm_version: string | null;
  revealed_seed: string | null;
  result_hash: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface PaymentSubmission {
  id: string;
  round_id: string;
  user_id: string;
  amount_pesewas: number;
  momo_provider: string;
  sender_phone: string;
  transaction_reference: string;
  receipt_path: string | null;
  status: PaymentStatus;
  admin_notes: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface RaffleEntry {
  id: string;
  round_id: string;
  user_id: string;
  payment_id: string;
  display_name: string;
  assigned_number: number;
  status: EntryStatus;
  eliminated_stage: number | null;
  eliminated_at: string | null;
  created_at: string;
}

export interface PublicParticipant {
  id: string;
  round_id: string;
  display_name: string;
  assigned_number: number;
  status: EntryStatus;
  eliminated_stage: number | null;
  eliminated_at: string | null;
}

export interface RaffleStage {
  id: string;
  round_id: string;
  stage_number: number;
  stage_name: string;
  starting_count: number;
  eliminate_count: number;
  surviving_count: number;
  status: "prepared" | "published";
  published_at: string | null;
}

export interface StageResult {
  id: string;
  round_id: string;
  stage_number: number;
  eliminated_numbers: number[];
  surviving_numbers: number[];
  elimination_sequence: number[];
  published_at: string;
}

export interface Winner {
  id: string;
  round_id: string;
  entry_id: string;
  user_id: string;
  position: 1 | 2 | 3;
  display_name: string;
  assigned_number: number;
  prize_pesewas: number;
  payout_status: PayoutStatus;
  payout_reference: string | null;
  paid_at: string | null;
  created_at: string;
}

export interface RaffleEvent {
  id: string;
  round_id: string;
  sequence_number: number;
  event_type:
    | "DRAW_LOCKED"
    | "STAGE_PUBLISHED"
    | "FINAL_SIX_STARTED"
    | "FINAL_SIX_ELIMINATION"
    | "WINNERS_REVEALED"
    | "RAFFLE_COMPLETED";
  payload: Record<string, unknown>;
  created_at: string;
}

export interface AuditLog {
  id: string;
  actor_id: string | null;
  action: string;
  target_type: string;
  target_id: string;
  previous_value: Record<string, unknown> | null;
  new_value: Record<string, unknown> | null;
  created_at: string;
}

export interface PlatformSettings {
  id: number;
  default_momo_network: string;
  default_momo_number: string;
  default_momo_account_name: string;
  max_entries_per_user_per_raffle: number;
  maintenance_mode: boolean;
  updated_at: string;
}

