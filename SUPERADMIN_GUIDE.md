# Superadmin Management Guide

This guide provides instructions for manually managing the `superadmin` user and resetting passwords using SQL and a helper script.

## 1. Prerequisites: Generate a Password Hash

This project uses PBKDF2 password hashing (instead of the default scrypt) for Cloudflare Workers compatibility. Use `gen-pass.ts` to generate a valid hash.

1.  Open `gen-pass.ts`.
2.  Set your desired password:
    ```typescript
    const password = "your-new-password"; 
    ```
3.  Run the script:
    ```bash
    pnpm dlx tsx gen-pass.ts
    ```
4.  Copy the generated hash.

## 2. SQL CRUD Operations

All SQL statements use the SQLite format. Replace `<GENERATED_HASH>` with the hash from step 1.

### Create Superadmin
```sql
-- Insert User
INSERT INTO user (id, name, email, email_verified, role, created_at, updated_at)
VALUES (
  'superadmin-id-1', 
  'Super Admin', 
  'admin@example.com', 
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
```

### Read Superadmins
```sql
SELECT u.id, u.name, u.email, u.role, a.password 
FROM user u
JOIN account a ON u.id = a.user_id
WHERE u.role = 'superadmin';
```

### Update Superadmin Password
Generate a new hash first, then run:
```sql
UPDATE account 
SET password = '<NEW_GENERATED_HASH>', updated_at = (strftime('%s', 'now') * 1000)
WHERE user_id = (SELECT id FROM user WHERE email = 'admin@example.com');
```

### Delete Superadmin
```sql
-- This will cascade delete the account entry if configured, or delete manually:
DELETE FROM account WHERE user_id = (SELECT id FROM user WHERE email = 'admin@example.com');
DELETE FROM user WHERE email = 'admin@example.com';
```

## 3. Security Notes
- Only `superadmin` users can generate invitations for new PIC users.
- PIC users sign up via the invitation link and are automatically assigned to their dialysis centers.
