-- Password hashes generated via: pnpm dlx tsx gen-pass.ts (uses Better Auth's default credential hashing)

-- 1. Reset and Create Superadmin
BEGIN TRANSACTION;

DELETE FROM invitation;

DELETE FROM user
WHERE role = 'superadmin';

INSERT INTO user (id, name, email, email_verified, role, created_at, updated_at)
VALUES (
  '<SUPERADMIN_USER_ID>',
  '<SUPERADMIN_NAME>',
  '<SUPERADMIN_EMAIL>',
  1,
  'superadmin',
  (strftime('%s', 'now') * 1000),
  (strftime('%s', 'now') * 1000)
);

INSERT INTO account (id, account_id, provider_id, user_id, password, created_at, updated_at)
VALUES (
  '<SUPERADMIN_ACCOUNT_ID>',
  '<SUPERADMIN_USER_ID>',
  'credential',
  '<SUPERADMIN_USER_ID>',
  '<GENERATED_HASH>',
  (strftime('%s', 'now') * 1000),
  (strftime('%s', 'now') * 1000)
);

COMMIT;

-- 2. Read Superadmin
SELECT u.id, u.name, u.email, u.role, a.password 
FROM user u
JOIN account a ON u.id = a.user_id
WHERE u.role = 'superadmin';

-- 3. Update Superadmin Password
-- Generate a new hash and run:
-- UPDATE account 
-- SET password = '<NEW_GENERATED_HASH>', updated_at = (strftime('%s', 'now') * 1000)
-- WHERE user_id = (SELECT id FROM user WHERE email = '<SUPERADMIN_EMAIL>');

-- 4. Delete All Superadmins and Invitations
-- BEGIN TRANSACTION;
-- DELETE FROM invitation;
-- DELETE FROM user
-- WHERE role = 'superadmin';
-- COMMIT;
