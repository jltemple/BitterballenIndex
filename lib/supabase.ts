import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Public client (for read queries from browser or server components)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Service-role client (for admin writes — only used in API routes / server-side)
export function createServiceClient() {
  return createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  });
}

// Types
export interface Bar {
  id: string;
  name: string;
  address: string | null;
  neighborhood: string | null;
  lat: number | null;
  lng: number | null;
  website: string | null;
  osm_id: number | null;
  has_bitterballen: boolean;
  created_at: string;
}

export interface Price {
  id: string;
  bar_id: string;
  price_cents: number;
  quantity: number;
  notes: string | null;
  recorded_at: string;
}

export interface BarWithLatestPrice extends Bar {
  latest_price_cents: number | null;
  latest_recorded_at: string | null;
}

export interface BarWithPrices extends Bar {
  prices: Price[];
}

export interface NeighborhoodPrice {
  neighborhood: string;
  avg_price_cents: number;
  bar_count: number;
}
