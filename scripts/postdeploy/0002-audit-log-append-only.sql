-- The audit trail is append-only: rows in audit_logs can be added, never
-- changed or removed through the application's connection. A deliberate,
-- recorded maintenance step can lift this for one transaction only:
--   SET LOCAL dpa.audit_maintenance = 'on';
-- Re-runnable (CREATE OR REPLACE).
CREATE OR REPLACE FUNCTION dpa_audit_logs_append_only() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF current_setting('dpa.audit_maintenance', true) = 'on' THEN
    RETURN COALESCE(NEW, OLD);
  END IF;
  RAISE EXCEPTION 'audit_logs is append-only: % is not allowed', TG_OP
    USING ERRCODE = 'insufficient_privilege';
END
$$;

DO $$ BEGIN
  IF to_regclass('public.audit_logs') IS NOT NULL THEN
    CREATE OR REPLACE TRIGGER audit_logs_append_only_rows
      BEFORE UPDATE OR DELETE ON "audit_logs"
      FOR EACH ROW EXECUTE FUNCTION dpa_audit_logs_append_only();
    CREATE OR REPLACE TRIGGER audit_logs_append_only_truncate
      BEFORE TRUNCATE ON "audit_logs"
      FOR EACH STATEMENT EXECUTE FUNCTION dpa_audit_logs_append_only();
  END IF;
END $$;

-- Functions created above are not callable through Supabase's API.
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON FUNCTION dpa_audit_logs_append_only() FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON FUNCTION dpa_audit_logs_append_only() FROM authenticated;
  END IF;
  REVOKE ALL ON FUNCTION dpa_audit_logs_append_only() FROM PUBLIC;
END $$;
