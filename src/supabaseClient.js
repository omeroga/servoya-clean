import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

// Load .env once
dotenv.config();

// Safe vars
const SUPABASE_URL = process.env.SUPABASE_URL?.trim();
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

// Validations
if (!SUPABASE_URL) {
  throw new Error("❌ Missing SUPABASE_URL in .env");
}

if (!SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("❌ Missing SUPABASE_SERVICE_ROLE_KEY in .env");
}

// Single unified client with full permissions
export const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      persistSession: false,
    }
  }
);