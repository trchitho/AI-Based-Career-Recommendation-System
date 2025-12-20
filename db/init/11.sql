-- kiểm tra các giá trị đang có
SELECT payment_method, COUNT(*)
FROM core.payments
GROUP BY payment_method
ORDER BY 2 DESC;

-- sửa chữ thường -> chữ hoa
UPDATE core.payments
SET payment_method = 'ZALOPAY'
WHERE payment_method = 'zalopay';


ALTER TABLE core.payments
ADD CONSTRAINT ck_payments_status_enum
CHECK (status IN ('PENDING','SUCCESS','FAILED','CANCELLED'));


ALTER TABLE core.user_subscriptions
  ALTER COLUMN start_date SET DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE core.user_subscriptions
  ALTER COLUMN end_date SET DEFAULT (CURRENT_TIMESTAMP + interval '30 days');
