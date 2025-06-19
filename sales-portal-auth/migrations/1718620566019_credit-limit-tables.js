/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
    pgm.sql(`
    CREATE SCHEMA IF NOT EXISTS "credit";

    DO $$
    BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'transaction_status') THEN
            CREATE TYPE credit.transaction_status AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
        END IF;
    END $$;

    CREATE TABLE if not exists credit.transactions (
	id bigserial NOT NULL,
	transaction_id varchar(255) NOT NULL,
    childId varchar NOT NULL,
	requested_on timestamptz NULL DEFAULT now(),
	requested_by varchar NOT NULL DEFAULT 'KAMS'::character varying,
	status credit.transaction_status NOT NULL DEFAULT 'PENDING'::credit.transaction_status,
	responded_on _timestamptz NULL,
	responded_by _varchar NULL,
	reason varchar(255) NULL,
	baselimit varchar(255) NULL,
	expirydate date NULL,
	payercode varchar(255) NULL,
	customercode varchar(255) NULL,
	"type" varchar NULL DEFAULT 'REQUESTED'::character varying,
	amount_requested varchar NOT NULL,
	CONSTRAINT cl_transaction_pkey PRIMARY KEY (id),
	CONSTRAINT transactions_childid_key UNIQUE (childId)
);
 
    CREATE TABLE if not exists credit.audit_trail (
	id bigserial NOT NULL,
	user_id varchar(255) NULL,
	status bool NULL,
	updated_by varchar(255) NOT NULL,
	updated_on timestamptz NOT NULL DEFAULT now(),
	request_id varchar(255) NOT NULL,
	"comments" varchar(255) NULL,
	"type" varchar(255) NULL DEFAULT 'REQUESTED'::character varying,
	CONSTRAINT cl_audit_pkey PRIMARY KEY (id)
);

    CREATE TABLE if not exists credit.approvers (
        id bigserial not NULL,
        first_approver_name VARCHAR(255) NOT NULL,
        first_approver_email VARCHAR(255) NOT NULL,
        second_approver_name VARCHAR(255) NOT NULL,
        second_approver_email VARCHAR(255) NOT NULL,
        third_approver_name VARCHAR(255),
        third_approver_email VARCHAR(255),
        informers TEXT[] DEFAULT NULL,
        created_on timestamptz DEFAULT now() NOT null,
        updated_on timestamptz DEFAULT now() NOT null,
        created_by VARCHAR(255) NOT null,
        CONSTRAINT cl_approver_pkey PRIMARY KEY (id)
    );

    CREATE TABLE if not exists credit.audit_history (
	id bigserial NOT NULL,
	user_id varchar(255) NOT NULL,
	request_id varchar(255) NOT NULL,
	approver_details _text NULL,
	customer_code varchar(255) NULL,
	base_limit varchar(255) NULL,
	expiry_date date NULL,
	amount_requested varchar(255) NULL
    );

    `)
};

exports.down = pgm => {
    pgm.sql(`
        DROP TYPE IF EXISTS transaction_status;
        DROP TABLE IF EXISTS "credit"."transactions";
        DROP TABLE IF EXISTS "credit"."audit_trail";
        DROP TABLE IF EXISTS "credit"."approvers";
        DROP SCHEMA IF EXISTS "credit";
    `);
}