-- D'Phoenix WhatsApp — automatic messages through Meta's WhatsApp Business
-- Platform: each customer's and each colleague's agreement to receive
-- updates on WhatsApp (off until recorded), the record of every automatic
-- message (sent, failed or skipped; only the number's last four digits), and
-- a document-link kind for a Vehicle Service's estimate PDF. Additive only
-- (new columns with safe defaults, one new type, one new table that starts
-- empty, its indexes, one new enum value); re-runnable; skipped on a
-- brand-new database, where `prisma db push` creates everything. The push
-- that follows adds the foreign key.
DO $$
BEGIN
  IF to_regclass('public.organisations') IS NULL OR to_regclass('public.customers') IS NULL OR to_regclass('public.users') IS NULL THEN
    RETURN;
  END IF;

  -- Off until the customer agrees (registration, their page, or the customer portal).
  ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "whatsappOptIn" BOOLEAN NOT NULL DEFAULT false;
  ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "whatsappOptInAt" TIMESTAMP(3);
  ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "whatsappOptInById" TEXT;

  -- Off until the colleague switches it on, on their profile.
  ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "whatsappOptIn" BOOLEAN NOT NULL DEFAULT false;
  ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "whatsappOptInAt" TIMESTAMP(3);
  ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "whatsappOptInById" TEXT;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'WhatsAppMessageStatus') THEN
    CREATE TYPE "WhatsAppMessageStatus" AS ENUM ('SENT', 'FAILED', 'SKIPPED');
  END IF;

  -- Never the message text, a link or the full number. Kept 90 days.
  CREATE TABLE IF NOT EXISTS "whatsapp_messages" (
    "id"                TEXT NOT NULL,
    "organisationId"    TEXT NOT NULL,
    "templateKey"       TEXT NOT NULL,
    "toLast4"           TEXT,
    "status"            "WhatsAppMessageStatus" NOT NULL,
    "error"             TEXT,
    "providerMessageId" TEXT,
    "relatedType"       TEXT,
    "relatedId"         TEXT,
    "createdAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "whatsapp_messages_pkey" PRIMARY KEY ("id")
  );
  CREATE INDEX IF NOT EXISTS "whatsapp_messages_organisationId_createdAt_idx" ON "whatsapp_messages"("organisationId", "createdAt");
  CREATE INDEX IF NOT EXISTS "whatsapp_messages_relatedType_relatedId_idx" ON "whatsapp_messages"("relatedType", "relatedId");

  -- A Vehicle Service's estimate PDF, sent with its WhatsApp message (recordId: the Vehicle Service).
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'DocumentLinkKind') THEN
    ALTER TYPE "DocumentLinkKind" ADD VALUE IF NOT EXISTS 'SERVICE_ESTIMATE';
  END IF;
END $$;
