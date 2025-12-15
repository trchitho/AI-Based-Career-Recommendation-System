-- Check current blog_status enum values
SELECT enumlabel 
FROM pg_enum 
WHERE enumtypid = (
    SELECT oid 
    FROM pg_type 
    WHERE typname = 'blog_status'
);

-- Check table structure
\d core.blog_posts;

-- Check if there's a constraint instead of enum
SELECT conname, consrc 
FROM pg_constraint 
WHERE conrelid = 'core.blog_posts'::regclass 
AND conname LIKE '%status%';