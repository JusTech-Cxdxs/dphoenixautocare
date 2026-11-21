-- Reference data every environment needs: the five roles and the settings row.
-- Re-runnable and additive: existing rows are never changed.
INSERT INTO "roles" ("id", "key", "name", "description", "updatedAt") VALUES
  ('role_owner',      'OWNER',      'Owner',      'The MD/CEO. Sees everything, approves everything, and is the only one who sees job profit and cost prices.', now()),
  ('role_front_desk', 'FRONT_DESK', 'Front Desk', 'The daily user. Receives vehicles, books appointments, opens job cards, writes estimates and invoices, and records payments.', now()),
  ('role_supervisor', 'SUPERVISOR', 'Supervisor', 'Quality-checks a job before it is ready for pickup. Optional: switch on in Settings.', now()),
  ('role_technician', 'TECHNICIAN', 'Technician', 'Sees only their own jobs, marks them started or done, and adds notes and photos. Optional: switch on in Settings.', now()),
  ('role_security',   'SECURITY',   'Security',   'Runs the gate: vehicles in, vehicles out and gate passes. Optional: switch on in Settings.', now())
ON CONFLICT ("key") DO NOTHING;

INSERT INTO "settings" ("id", "updatedAt") VALUES (1, now()) ON CONFLICT ("id") DO NOTHING;
