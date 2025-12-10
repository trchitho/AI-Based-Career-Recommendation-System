-- Table: core.payments

-- DROP TABLE IF EXISTS core.payments;

CREATE TABLE IF NOT EXISTS core.payments
(
    id bigint NOT NULL DEFAULT nextval('core.payments_id_seq'::regclass),
    user_id bigint NOT NULL,
    order_id character varying(100) COLLATE pg_catalog."default" NOT NULL,
    app_trans_id character varying(100) COLLATE pg_catalog."default",
    amount integer NOT NULL,
    description text COLLATE pg_catalog."default",
    payment_method character varying(20) COLLATE pg_catalog."default" DEFAULT 'zalopay'::character varying,
    status character varying(20) COLLATE pg_catalog."default" DEFAULT 'pending'::character varying,
    zp_trans_token character varying(255) COLLATE pg_catalog."default",
    order_url text COLLATE pg_catalog."default",
    callback_data text COLLATE pg_catalog."default",
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    paid_at timestamp with time zone,
    CONSTRAINT payments_pkey PRIMARY KEY (id),
    CONSTRAINT payments_app_trans_id_key UNIQUE (app_trans_id),
    CONSTRAINT payments_order_id_key UNIQUE (order_id),
    CONSTRAINT payments_user_id_fkey FOREIGN KEY (user_id)
        REFERENCES core.users (id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE CASCADE
)

TABLESPACE pg_default;

ALTER TABLE IF EXISTS core.payments
    OWNER to postgres;
-- Index: idx_payments_app_trans_id

-- DROP INDEX IF EXISTS core.idx_payments_app_trans_id;

CREATE INDEX IF NOT EXISTS idx_payments_app_trans_id
    ON core.payments USING btree
    (app_trans_id COLLATE pg_catalog."default" ASC NULLS LAST)
    TABLESPACE pg_default;
-- Index: idx_payments_created_at

-- DROP INDEX IF EXISTS core.idx_payments_created_at;

CREATE INDEX IF NOT EXISTS idx_payments_created_at
    ON core.payments USING btree
    (created_at DESC NULLS FIRST)
    TABLESPACE pg_default;
-- Index: idx_payments_order_id

-- DROP INDEX IF EXISTS core.idx_payments_order_id;

CREATE INDEX IF NOT EXISTS idx_payments_order_id
    ON core.payments USING btree
    (order_id COLLATE pg_catalog."default" ASC NULLS LAST)
    TABLESPACE pg_default;
-- Index: idx_payments_status

-- DROP INDEX IF EXISTS core.idx_payments_status;

CREATE INDEX IF NOT EXISTS idx_payments_status
    ON core.payments USING btree
    (status COLLATE pg_catalog."default" ASC NULLS LAST)
    TABLESPACE pg_default;
-- Index: idx_payments_user_id

-- DROP INDEX IF EXISTS core.idx_payments_user_id;

CREATE INDEX IF NOT EXISTS idx_payments_user_id
    ON core.payments USING btree
    (user_id ASC NULLS LAST)
    TABLESPACE pg_default;