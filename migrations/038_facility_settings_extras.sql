-- P8: Extra JSONB settings on facility_settings
-- - emergency_contacts: { ambulance, doctor, codeBlue, notes }
-- - billing:            { accountName, bankName, bankAccountNumber, bankIban, walletProvider, walletNumber, instructions }
-- - facility_profile:   { facilityName, address, phone, email, logoUrl, reportLegalFooter }

ALTER TABLE facility_settings
  ADD COLUMN IF NOT EXISTS emergency_contacts JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS billing            JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS facility_profile   JSONB NOT NULL DEFAULT '{}'::jsonb;
