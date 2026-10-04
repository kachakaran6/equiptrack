-- Migration 011: Bootstrap Initial Admins
-- Ensures primary admin accounts have admin role in production

UPDATE users 
SET role = 'admin', status = 'active'
WHERE email IN ('karan@gmail.com', '1sanjaypathak@gmail.com');

-- If no admins exist at all, promote the earliest registered user
UPDATE users
SET role = 'admin'
WHERE id = (
  SELECT id FROM users ORDER BY created_at ASC LIMIT 1
)
AND NOT EXISTS (
  SELECT 1 FROM users WHERE role = 'admin'
);
