-- Migration 012: Ensure Admin Accounts
-- Promotes configured administrators to role 'admin' and active status

UPDATE users 
SET role = 'admin', status = 'active'
WHERE LOWER(email) IN ('karan@gmail.com', '1sanjaypathak@gmail.com', 'admin@equiptrack.internal');
