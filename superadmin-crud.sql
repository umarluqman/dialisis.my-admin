-- Password hashes generated via: pnpm dlx tsx gen-pass.ts (uses PBKDF2, not scrypt)

-- 1. Create Superadmin
-- Insert User
INSERT INTO user (id, name, email, email_verified, role, created_at, updated_at)
VALUES (
  'superadmin-id-1', 
  'Umar Luqman', 
  'umarluqman.78@gmail.com', 
  1, 
  'superadmin', 
  (strftime('%s', 'now') * 1000), 
  (strftime('%s', 'now') * 1000)
);

-- Insert Account (linked via user_id)
INSERT INTO account (id, account_id, provider_id, user_id, password, created_at, updated_at)
VALUES (
  'superadmin-account-1',
  'superadmin-id-1',
  'email-password',
  'superadmin-id-1',
  '<GENERATED_HASH>',
  (strftime('%s', 'now') * 1000), 
  (strftime('%s', 'now') * 1000)
);

-- 2. Read Superadmin
SELECT u.id, u.name, u.email, u.role, a.password 
FROM user u
JOIN account a ON u.id = a.user_id
WHERE u.role = 'superadmin';

-- 3. Update Superadmin Password
-- Generate a new hash and run:
-- UPDATE account 
-- SET password = '<NEW_GENERATED_HASH>', updated_at = (strftime('%s', 'now') * 1000)
-- WHERE user_id = (SELECT id FROM user WHERE email = 'admin@example.com');

-- 4. Delete Superadmin (and related data)
-- DELETE FROM user WHERE email = 'admin@example.com';
