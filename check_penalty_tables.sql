-- Check what penalty-related tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE '%penalty%' OR table_name LIKE '%penalties%';

-- Also check for any donation or payment related tables
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND (table_name LIKE '%donation%' OR table_name LIKE '%payment%' OR table_name LIKE '%penalty%');