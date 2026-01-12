DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'AdminActionStatus') THEN
    CREATE TYPE "AdminActionStatus" AS ENUM ('PENDING', 'CONFIRMED', 'EXECUTED', 'CANCELLED');
  END IF;
END$$;
