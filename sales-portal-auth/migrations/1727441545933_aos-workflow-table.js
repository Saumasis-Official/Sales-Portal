/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
    pgm.sql(`
        CREATE SCHEMA IF NOT EXISTS "audit";
        CREATE TABLE audit.aos_workflow (
            id bigserial NOT NULL,
            distributor_code varchar NOT NULL,
            order_date date DEFAULT CURRENT_DATE NOT NULL,
            pdp jsonb NULL,
            warehouse_response jsonb NULL,
            errors text NULL,
            created_on timestamptz DEFAULT now() NOT NULL,
            updated_on timestamptz DEFAULT now() NOT NULL,
            order_payload jsonb NULL,
            deleted bool DEFAULT false NOT NULL,
            holdings jsonb NULL,
            sap_validation_payload_1 jsonb NULL,
            sap_validation_response_1 jsonb NULL,
            sap_validation_errors_1 jsonb NULL,
            sap_validation_payload_2 jsonb NULL,
            sap_validation_response_2 jsonb NULL,
            sap_validation_errors_2 jsonb NULL,
            sap_submit_payload jsonb NULL,
            sap_submit_response jsonb NULL,
            order_id int8 NULL,
            CONSTRAINT aos_workflow_pk PRIMARY KEY (id),
            CONSTRAINT aos_workflow_unique UNIQUE (distributor_code, order_date),
            CONSTRAINT aos_workflow_distributor_master_fk FOREIGN KEY (distributor_code) REFERENCES public.distributor_master(id),
            CONSTRAINT aos_workflow_orders_fk FOREIGN KEY (order_id) REFERENCES public.orders(id)
        );

        ALTER TYPE sync_type ADD VALUE IF NOT EXISTS 'ARS_STOCK_NORM_CV';
        ALTER TYPE sync_type ADD VALUE IF NOT EXISTS 'AOS_WAREHOUSE_PAYLOAD';
        ALTER TYPE sync_type ADD VALUE IF NOT EXISTS 'AOS_ORDER_SUBMIT';
    `);
};

exports.down = pgm => {
    pgm.sql(`
        DROP TABLE IF EXISTS audit.aos_workflow;
        DROP SCHEMA IF EXISTS "audit";
    `);
};
