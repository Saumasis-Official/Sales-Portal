/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = (pgm) => {
    pgm.sql(`
            CREATE TABLE IF NOT EXISTS cfa_survey_questionnaire  (
                id bigserial NOT NULL PRIMARY KEY,
                logistic_id character varying(20) NOT NULL DEFAULT 'PORTAL_MANAGED',
                questions jsonb NOT NULL,
                depot_code character varying(5) NOT NULL,
                applicable_distributors character varying[] NOT NULL,
                updated_on timestamptz DEFAULT now(),
                survey_start timestamptz,
                survey_end timestamptz
            );

            CREATE TABLE IF NOT EXISTS cfa_survey_response  (
                id bigserial NOT NULL PRIMARY KEY,
                questionnaire_id bigint NOT NULL,
                db_code character varying(20) NOT NULL,
                response jsonb NOT NULL,
                updated_on timestamptz DEFAULT now(),
                updated_by character varying NOT NULL,
                survey_start timestamptz NOT NULL,
                survey_end timestamptz NOT NULL,
                db_cfa_details jsonb NOT NULL,
                CONSTRAINT cfa_survey_response_un UNIQUE (questionnaire_id, db_code),
                CONSTRAINT db_code_fkey FOREIGN KEY (db_code)
                    REFERENCES distributor_master (id)
                    ON UPDATE RESTRICT
                    ON DELETE CASCADE,
                CONSTRAINT questionnaire_id_fkey FOREIGN KEY (questionnaire_id)
                    REFERENCES cfa_survey_questionnaire (id)
                    ON UPDATE RESTRICT
                    ON DELETE CASCADE);

            CREATE TABLE IF NOT EXISTS cfa_survey_response_audit_trail(
                id bigserial NOT NULL PRIMARY KEY,
                response_id bigint NOT NULL,
                response jsonb NOT NULL,
                survey_start timestamptz NOT NULL,
                survey_end timestamptz NOT NULL,
                db_cfa_details jsonb NOT NULL,
                updated_on timestamptz DEFAULT now(),
                updated_by character varying NOT NULL,
                CONSTRAINT cfa_survey_response_fkey FOREIGN KEY (response_id)
                    REFERENCES cfa_survey_response (id)
                    ON UPDATE RESTRICT);

            DO $$
            BEGIN
                IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'cfa_survey_notification_type') THEN
                CREATE TYPE cfa_survey_notification_type AS ENUM (
                    'INITIAL',
                    'FOLLOW_UP'
                );
                END IF;
            END
            $$;
            
            CREATE TABLE IF NOT EXISTS  cfa_survey_notification_logs (
                id bigserial NOT NULL,
                distributor_id varchar(20) NOT NULL,
                questionnaire_id bigint NOT NULL,
                first_notification timestamptz NOT NULL DEFAULT now(),
                last_notification timestamptz NULL DEFAULT now(),
                email_to text NOT NULL,
                email_cc text NULL,
                notification_count numeric NOT NULL DEFAULT 1,
                email_type cfa_survey_notification_type NOT NULL DEFAULT 'INITIAL'::cfa_survey_notification_type,
                CONSTRAINT survey_notification_logs_pkey PRIMARY KEY (id),
                CONSTRAINT cfa_survey_notification_logs_un UNIQUE (questionnaire_id, distributor_id),
                CONSTRAINT survey_notification_logs_fk_db_id FOREIGN KEY (distributor_id) REFERENCES public.distributor_master(id) ON DELETE CASCADE ON UPDATE CASCADE,
                CONSTRAINT survey_notification_logs_fk_qs_id FOREIGN KEY (questionnaire_id) REFERENCES public.cfa_survey_questionnaire(id) ON DELETE CASCADE ON UPDATE CASCADE
            );

            insert
                into
                cfa_survey_questionnaire (questions,
                depot_code,
                updated_on,
                survey_start,
                survey_end,
                applicable_distributors)
                        select
                distinct on
                (depot_code)
                        '{"1": "How satisfied you are with the time taken to delivery your orders?", "2": "How would you rate the product quality at the time of delivery?", "3": "How would you rate the quality of truck (cleanliness/tarpaulin etc.) which was carrying our product?", "4": "How satisfied are you with the communication and responsiveness of our CFA during the delivery process?", "5": "How satisfied are you with our speed of resolution of issues like shortage, damage products etc.", "6": "Overall rating on your experience with CFA"}'::jsonb as questions,
                depot_code,
                now() as updated_on ,
                '2024-01-01 00:00:00.000 +0530' as survey_start ,
                '2024-01-14 23:59:59.000 +0530' as survey_end,
                db_plant.applicable_distributors
            from
                cfa_depot_mapping cdm
            inner join (
                select
                    array_agg(distinct dm.id) applicable_distributors,
                    pm.name
                from
                    distributor_master dm
                inner join distributor_plants dp on
                    dp.distributor_id = dm.id
                inner join plant_master pm on
                    pm.id = dp.plant_id
                inner join customer_group_master cgm on
                    cgm.id = dm.group_id
                where 
                    cgm.name in ('10','11','31')
                group by
                    pm.name
            ) as db_plant on
                db_plant.name = cdm.depot_code
            order by depot_code asc;
        `);
};

exports.down = (pgm) => {
    pgm.sql(`
            DROP TABLE IF EXISTS cfa_survey_response_audit_trail;
            DROP TABLE IF EXISTS cfa_survey_response;
            DROP TABLE IF EXISTS cfa_survey_notification_logs;
            DROP TABLE IF EXISTS cfa_survey_questionnaire;
            DROP TYPE IF EXISTS cfa_survey_notification_type;
        `);
};