-- Drop the uniqueness constraint on roll number to allow multiple accounts to use the same roll number

DROP INDEX IF EXISTS idx_player_profiles_roll;
