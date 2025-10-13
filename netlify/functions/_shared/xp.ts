import { supabaseAdmin } from '../supabase'

// XP rewards for different actions
export const XP_REWARDS = {
  connected_bank: 10,
  weekly_sync: 15,
  uploaded_receipt: 5,
  categorized_10: 10,
  completed_goal: 50,
  high_score_bonus: 25,
  first_chat: 5,
  daily_login: 2,
  perfect_week: 100,
}

export async function awardXP(
  userId: string, 
  reason: keyof typeof XP_REWARDS | string,
  customDelta?: number
) {
  const delta = customDelta ?? XP_REWARDS[reason as keyof typeof XP_REWARDS] ?? 5

  const { error } = await supabaseAdmin
    .from("user_xp")
    .insert({ 
      user_id: userId, 
      delta, 
      reason 
    })

  if (error) {
    console.error('Failed to award XP:', error)
    return false
  }

  return true
}

export async function getTotalXP(userId: string): Promise<number> {
  const { data, error } = await supabaseAdmin
    .from('user_xp')
    .select('delta')
    .eq('user_id', userId)

  if (error) {
    console.error('Failed to get total XP:', error)
    return 0
  }

  return (data || []).reduce((sum, row) => sum + (row.delta || 0), 0)
}

export async function getLevel(userId: string): Promise<{ level: number; xp: number; nextLevelXP: number }> {
  const totalXP = await getTotalXP(userId)
  
  // Simple leveling: 100 XP per level, with increasing requirements
  let level = 1
  let xpNeeded = 100
  let xpSoFar = 0

  while (totalXP >= xpSoFar + xpNeeded) {
    xpSoFar += xpNeeded
    level++
    xpNeeded = Math.floor(100 * Math.pow(1.1, level - 1)) // 10% increase per level
  }

  const currentLevelXP = totalXP - xpSoFar
  const nextLevelXP = xpNeeded

  return { level, xp: currentLevelXP, nextLevelXP }
}




