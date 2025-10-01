import { supabase } from '../lib/supabase';

/**
 * Utility functions to trigger XP awards for various user actions
 * CURRENTLY DISABLED
 */

/**
 * Award XP for uploading a file
 * @param userId User ID
 * @param fileType Type of file uploaded (CSV, PDF, etc.)
 */
export const awardFileUploadXP = async (userId: string, fileType: string) => {
  // Gamification disabled - not awarding XP
  console.log('Gamification disabled - file upload XP not awarded:', { userId, fileType});
};

/**
 * Award XP for scanning a receipt
 * @param userId User ID
 * @param success Whether the scan was successful
 */
export const awardReceiptScanXP = async (userId: string, success: boolean) => {
  // Gamification disabled - not awarding XP
  console.log('Gamification disabled - receipt scan XP not awarded:', { userId, success});
};

/**
 * Award XP for using AI categorization
 * @param userId User ID
 * @param transactionCount Number of transactions categorized
 */
export const awardAICategorizeXP = async (userId: string, transactionCount: number) => {
  // Gamification disabled - not awarding XP
  console.log('Gamification disabled - AI categorization XP not awarded:', { userId, transactionCount});
};

/**
 * Award XP for daily login
 * @param userId User ID
 */
export const awardDailyLoginXP = async (userId: string) => {
  // Gamification disabled - not awarding XP
  console.log('Gamification disabled - daily login XP not awarded:', { userId});
};

/**
 * Award XP for completing a mission
 * @param userId User ID
 * @param missionName Name of the mission
 * @param xpAmount Amount of XP to award
 */
export const awardMissionXP = async (userId: string, missionName: string, xpAmount: number) => {
  // Gamification disabled - not awarding XP
  console.log('Gamification disabled - mission XP not awarded:', { userId, missionName, xpAmount});
};