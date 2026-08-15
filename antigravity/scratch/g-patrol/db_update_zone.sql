-- 1. Add zone column to g_patrol_checkpoints table
ALTER TABLE g_patrol.g_patrol_checkpoints ADD COLUMN IF NOT EXISTS zone TEXT;

-- 2. Populate zone based on location details
UPDATE g_patrol.g_patrol_checkpoints 
SET zone = 'บริเวณศาล' 
WHERE location LIKE '%บริเวณศาล%' 
   OR name LIKE '%บริเวณศาล%' 
   OR name LIKE '%ศาล%'
   OR location LIKE '%ศาล%'
   OR asset_number IN ('CP-01', 'CP-02', 'CP-03', 'CP-04', 'CP-05', 'CP-06', 'CP-07', 'CP-08', 'CP-09', 'CP-10', 'CP-11', 'CP-12', 'CP-13', 'CP-14', 'CP-15', 'CP-16', 'CP-17', 'CP-18', 'CP-19', 'CP-20', 'CP-21');

UPDATE g_patrol.g_patrol_checkpoints 
SET zone = 'บ้านพัก' 
WHERE location LIKE '%บ้านพัก%' 
   OR name LIKE '%บ้านพัก%'
   OR asset_number IN ('CP-22', 'CP-23', 'CP-24', 'CP-25', 'CP-26', 'CP-27');

-- Set default to 'อื่นๆ' if not matched
UPDATE g_patrol.g_patrol_checkpoints 
SET zone = 'อื่นๆ' 
WHERE zone IS NULL;
