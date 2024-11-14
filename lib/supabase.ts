import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseKey)

export type WindTurbineRecord = {
  id: string
  name: string
  location: string
  power: number
  wind_speed: number
  temperature: number
  humidity: number
  status: 'normal' | 'warning' | 'error'
  created_at: string
  updated_at: string
}

export type SubstationRecord = {
  id: string
  name: string
  location: string
  capacity: number
  load: number
  created_at: string
  updated_at: string
}

export type ConnectionRecord = {
  id: number
  from_id: string
  to_id: string
  from_type: 'turbine' | 'substation'
  to_type: 'turbine' | 'substation'
  status: 'normal' | 'warning' | 'error'
  type: 'turbine-turbine' | 'turbine-substation'
  created_at: string
  updated_at: string
} 