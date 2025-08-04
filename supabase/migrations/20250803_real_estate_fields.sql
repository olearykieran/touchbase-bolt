/*
  # Add real estate specific fields to contacts table

  1. New Columns
    - `client_type` (text) - buyer, seller, referral_source, past_client, prospect
    - `property_address` (text) - address of property bought/sold
    - `transaction_date` (date) - date of transaction
    - `transaction_type` (text) - purchase, sale, both
    - `property_type` (text) - single_family, condo, townhouse, land, commercial
    - `price_range` (text) - price range preference
    - `notes` (text) - additional notes about the contact
    - `home_anniversary` (date) - date they purchased their home
    - `include_emojis` (boolean) - whether to include emojis in messages

  2. Constraints
    - Add check constraints for enum values
*/

-- Add real estate specific columns
ALTER TABLE contacts
ADD COLUMN client_type text,
ADD COLUMN property_address text,
ADD COLUMN transaction_date date,
ADD COLUMN transaction_type text,
ADD COLUMN property_type text,
ADD COLUMN price_range text,
ADD COLUMN notes text,
ADD COLUMN home_anniversary date,
ADD COLUMN include_emojis boolean DEFAULT true;

-- Add constraints for enum values
ALTER TABLE contacts
ADD CONSTRAINT valid_client_type CHECK (
  client_type IS NULL OR 
  client_type IN ('buyer', 'seller', 'referral_source', 'past_client', 'prospect')
),
ADD CONSTRAINT valid_transaction_type CHECK (
  transaction_type IS NULL OR 
  transaction_type IN ('purchase', 'sale', 'both')
),
ADD CONSTRAINT valid_property_type CHECK (
  property_type IS NULL OR 
  property_type IN ('single_family', 'condo', 'townhouse', 'land', 'commercial')
);

-- Create an index on client_type for faster filtering
CREATE INDEX idx_contacts_client_type ON contacts(client_type);