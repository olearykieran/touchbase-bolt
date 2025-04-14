/*
  # Add message tracking fields to contacts table

  1. Changes
    - Add reminder_interval field to contacts table
    - Add next_reminder field to contacts table
    - Update next_contact calculation based on reminder_interval

  2. Security
    - Maintain existing RLS policies
*/

ALTER TABLE contacts
ADD COLUMN reminder_interval interval NOT NULL DEFAULT '7 days'::interval;

-- Function to calculate next contact date based on reminder interval
CREATE OR REPLACE FUNCTION calculate_next_contact()
RETURNS trigger AS $$
BEGIN
  NEW.next_contact := NEW.last_contact + NEW.reminder_interval;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update next_contact when last_contact changes
CREATE TRIGGER update_next_contact
  BEFORE INSERT OR UPDATE OF last_contact, reminder_interval ON contacts
  FOR EACH ROW
  EXECUTE FUNCTION calculate_next_contact();

-- Update existing records
UPDATE contacts
SET next_contact = last_contact + reminder_interval;