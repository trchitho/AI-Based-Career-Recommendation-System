BEGIN;

-- Thêm các trạng thái còn thiếu vào ENUM public.blog_status
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'Pending'
      AND enumtypid = 'public.blog_status'::regtype
  ) THEN
    ALTER TYPE public.blog_status ADD VALUE 'Pending';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'Rejected'
      AND enumtypid = 'public.blog_status'::regtype
  ) THEN
    ALTER TYPE public.blog_status ADD VALUE 'Rejected';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'Archived'
      AND enumtypid = 'public.blog_status'::regtype
  ) THEN
    ALTER TYPE public.blog_status ADD VALUE 'Archived';
  END IF;
END$$;

COMMIT;
