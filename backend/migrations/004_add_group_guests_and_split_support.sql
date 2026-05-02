CREATE TABLE group_guests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  display_name text NOT NULL,
  created_by uuid REFERENCES profiles(id),
  assigned_to uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE expense_splits
  ADD COLUMN IF NOT EXISTS guest_id uuid REFERENCES group_guests(id) ON DELETE SET NULL;
ALTER TABLE expense_splits ALTER COLUMN user_id DROP NOT NULL;
