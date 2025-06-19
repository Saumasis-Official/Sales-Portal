/* eslint-disable camelcase */
/* eslint-disable no-undef */

exports.shorthands = undefined;

exports.up = (pgm) => {
    pgm.sql(`

        DO $$
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'action_type') THEN
                CREATE TYPE credit.action_type AS ENUM ('BASE_LIMIT_UPLOAD','BASE_LIMIT_REMOVAL', 'ADDITIONAL_LIMIT_UPLOAD','ADDITIONAL_LIMIT_REMOVAL');
            END IF;
        END
        $$;    
   
    CREATE TABLE if not exists credit.gt_transactions (
	id bigserial NOT NULL,
	transaction_id varchar(255) NOT NULL,
    child_id varchar NOT NULL,
    region varchar(255) NULL,
    requested_by varchar NOT NULL,
	requested_on timestamptz NULL DEFAULT now(),
    distributor_code varchar(255) NULL,
    distributor_name varchar(255) NULL,
	status credit.transaction_status NOT NULL DEFAULT 'PENDING'::credit.transaction_status,
    responded_by _varchar NULL,
	responded_on _timestamptz NULL,
	amount varchar(255) NULL,
    start_date timestamptz NULL,
    end_date timestamptz NULL,
    file_action_type credit.action_type NOT NULL,
    file_name varchar(255) NULL,
    file_link varchar(255) NULL,
	CONSTRAINT cl_gt_transactions_pkey PRIMARY KEY (id),
	CONSTRAINT gt_transactions_childid_key UNIQUE (child_id)
);

  DO $$
        BEGIN
            IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'email_type') THEN
                IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'GT_CREDIT_EXTENSION_REQUEST' AND enumtypid = 'email_type'::regtype) THEN
                    ALTER TYPE email_type ADD VALUE 'GT_CREDIT_EXTENSION_REQUEST';
                END IF;
                IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'GT_CREDIT_EXTENSION_RESPONSE' AND enumtypid = 'email_type'::regtype) THEN
                    ALTER TYPE email_type ADD VALUE 'GT_CREDIT_EXTENSION_RESPONSE';
                END IF;
            END IF;
        END
        $$;

    `);
};

exports.down = (pgm) => {
    pgm.sql(`
        DROP TABLE IF EXISTS credit.gt_transactions;
        DROP TYPE IF EXISTS credit.action_type;        
    `);
};
