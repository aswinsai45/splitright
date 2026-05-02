-- Drop the old constraint and re-add it with CASCADE
ALTER TABLE settlements
  DROP CONSTRAINT settlements_group_id_fkey,
  ADD CONSTRAINT settlements_group_id_fkey
    FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE;
