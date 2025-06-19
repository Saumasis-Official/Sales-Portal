/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
    pgm.sql(`
     DO $$
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'email_type') THEN
            CREATE TYPE email_type AS ENUM (
                'ARS_REPORT',
                'CREATE_ORDER',
                'CREDIT_CRUNCH_NOTIFICATION',
                'DB_SYNC_FAILED',
                'FORECAST_DUMP_STATUS',
                'FORECAST_WINDOW_CLOSE',
                'FORECAST_WINDOW_OPEN',
                'MDM_NOTIFICATION',
                'PASSWORD_RESET',
                'PDP_AUTO_UPDATE_REQUEST',
                'PDP_UNLOCK_REQUEST',
                'PDP_UNLOCK_RESPONSE',
                'PDP_UPDATE_REQUEST',
                'PDP_UPDATE_RESPONSE',
                'PLANT_CODE_AUTO_UPDATE_REQUEST',
                'PLANT_UPDATE_REQUEST',
                'PLANT_UPDATE_RESPONSE',
                'REPORT_CFA_PORTAL_ERROR',
                'REPORT_PORTAL_ERROR',
                'RESERVED_CREDIT_NOTIFICATION',
                'RO_REQUEST',
                'RO_RESPONSE',
                'SALES_HIERARCHY_REQUEST',
                'SALES_HIERARCHY_RESPONSE',
                'SDR_REQUEST',
                'SDR_RESPONSE',
                'SIH_BELOW_SS',
                'SURVEY_NOTIFICATION',
                'TSE_ADMIN_ORDER_CREATION',
                'TSE_ADMIN_UPDATE_EMAIL_MOBILE',
                'UPDATE_EMAIL',
                'WAREHOUSE_DETAILS_FETCH_FAILED',
                'WELCOME_AUTH',
                'WELCOME_ORDER',
                'WELCOME_SAP',
                'MT_ECOM_SO_SUCCESS',
                'MT_ECOM_ERROR',
                'MT_ECOM_REPORTS'
            );
            END IF;
        END
        $$;
        CREATE TABLE public.email_logs (
            id bigserial NOT NULL,
            "type" public.email_type NOT NULL,
            status public.sync_result NOT NULL,
            subject text NULL,
            recipients jsonb NOT NULL,
            reference text DEFAULT 'NA'::text NOT NULL,
            email_data jsonb NULL,
            error_logs text NULL,
            created_on timestamptz DEFAULT now() NOT NULL,
            CONSTRAINT email_logs_pk PRIMARY KEY (id)
        );
            `);
};

exports.down = pgm => {};
