/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = (pgm) => {
    pgm.sql(`
        CREATE TABLE IF NOT EXISTS auto_closure_mt_ecom_config (
            id BIGSERIAL PRIMARY KEY,
            customer_group VARCHAR NOT NULL,
            short_close_single_grn NUMERIC,
            short_close_multi_grn NUMERIC,
            remarks VARCHAR,
            updated_by VARCHAR DEFAULT 'PORTAL_MANAGED' NOT NULL,
            updated_on TIMESTAMPTZ DEFAULT now() NOT NULL,
            created_on TIMESTAMPTZ DEFAULT now() NOT NULL,
            deleted BOOLEAN DEFAULT FALSE NOT NULL,
            revision_id UUID DEFAULT gen_random_uuid() NOT NULL,
            CONSTRAINT auto_closure_mt_ecom_config_unique UNIQUE (customer_group),
            CONSTRAINT auto_closure_mt_ecom_config_customer_group_master_fk FOREIGN KEY (customer_group) REFERENCES public.customer_group_master("name")
        );

        CREATE TABLE IF NOT EXISTS audit.auto_closure_mt_ecom_config_audit (
            audit_id BIGSERIAL PRIMARY KEY,
            audit_timestamp TIMESTAMPTZ DEFAULT now() NOT NULL,
            id INT8 NOT NULL,
            customer_group VARCHAR NULL,
            short_close_single_grn NUMERIC NULL,
            short_close_multi_grn NUMERIC NULL,
            remarks VARCHAR NULL,
            updated_by VARCHAR NULL,
            updated_on TIMESTAMPTZ NULL,   
            created_on TIMESTAMPTZ NULL, 
            deleted BOOLEAN NULL,
            revision_id UUID NULL
        );

        CREATE OR REPLACE FUNCTION public.auto_closure_mt_ecom_config_audit_trigger_func()
        RETURNS trigger
        LANGUAGE plpgsql
        AS $function$
        BEGIN
            INSERT INTO audit.auto_closure_mt_ecom_config_audit (
                id,
                customer_group,
                short_close_single_grn,
                short_close_multi_grn,
                remarks,
                updated_by,
                updated_on,
                created_on,
                deleted,
                revision_id
            )
            VALUES (
                OLD.id,
                OLD.customer_group,
                OLD.short_close_single_grn,
                OLD.short_close_multi_grn,
                OLD.remarks,
                OLD.updated_by,
                OLD.updated_on,
                OLD.created_on,
                OLD.deleted,
                OLD.revision_id
            );
            RETURN NEW;
        END;
        $function$;
        
        DROP TRIGGER IF EXISTS auto_closure_mt_ecom_config_trigger ON public.auto_closure_mt_ecom_config;

        CREATE TRIGGER auto_closure_mt_ecom_config_trigger
        BEFORE DELETE OR UPDATE
        ON public.auto_closure_mt_ecom_config
        FOR EACH ROW
        EXECUTE FUNCTION auto_closure_mt_ecom_config_audit_trigger_func();   
        
        
        INSERT INTO public.auto_closure_mt_ecom_config (customer_group)
        VALUES ('14'), ('15'), ('16'), ('28'),('42')
        ON CONFLICT (customer_group) DO NOTHING;
        
        CREATE OR REPLACE PROCEDURE public.distributor_sync_proc(IN uuid text)
        LANGUAGE plpgsql
        AS $procedure$
            declare 
            P_CHK integer;
                BEGIN
                select 1 into P_CHK from staging.distributor_plants_staging;
            if p_chk = 1 then
            INSERT INTO public.group5_master (
                id,
                "name",
                description,
                status,
                created_on,
                updated_on,
                rsm_code,
                cluster_code
            )
            SELECT
                id,
                "name",
                description,
                status::TEXT::entity_status,
                created_on,
                updated_on,
                rsm_code,
                cluster_code
            FROM
                staging.group5_master_staging
            ON CONFLICT ("name") DO UPDATE
            SET
                description = EXCLUDED.description;
            INSERT INTO public.customer_group_master (
                id,
                "name",
                description,
                status,
                created_on,
                updated_on,
                pdp_update_enabled
            )
            SELECT
                id,
                "name",
                description,
                status::TEXT::entity_status,
                created_on,
                updated_on,
                pdp_update_enabled
            FROM
                staging.customer_group_master_staging
            ON CONFLICT ("name") DO UPDATE
            SET
                description = EXCLUDED.description;
            INSERT INTO public.user_profile (
                id,
                "name",
                email,
                mobile,
                "type",
                created_on,
                updated_on
            )
            SELECT
                id,
                "name",
                email,
                mobile,
                "type"::TEXT::user_type,
                created_on,
                updated_on
            FROM
                staging.user_profile_staging
            ON CONFLICT (id) DO UPDATE
            SET
                "name" = EXCLUDED."name",
                email = EXCLUDED.email,
                mobile = EXCLUDED.mobile,
                "type" = EXCLUDED."type";
            
            INSERT INTO public.plant_master (
                id,
                "name",
                description,
                status,
                created_on,
                updated_on
            )
            SELECT 
                id,
                "name",
                description,
                status::TEXT::entity_status,
                created_on,
                updated_on
            FROM
                staging.plant_master_staging
            ON CONFLICT ("name") DO UPDATE
            SET
                description = EXCLUDED.description;
            INSERT INTO public.region_master (
                id,
                code,
                description,
                status,
                created_on,
                updated_on
            )
            SELECT 
                id,
                code,
                description,
                status::TEXT::entity_status,
                created_on,
                updated_on
            FROM
                staging.region_master_staging
            ON CONFLICT (code) DO UPDATE
            SET
                description = EXCLUDED.description;
            INSERT INTO public.cfa_depot_mapping (
                "zone",
                depot_code,
                sales_org,
                distribution_channel,
                division,
                "name",
                email,
                contact_person,
                group5_id
            )
            SELECT
                "zone",
                depot_code,
                sales_org,
                distribution_channel,
                division,
                "name",
                email,
                contact_person,
                group5_id
            FROM
                staging.cfa_depot_mapping_staging
            ON CONFLICT DO NOTHING;
            INSERT INTO public.distributor_master (
                id,
                profile_id,
                city,
                postal_code,
                region_id,
                group_id,
                tse_code,
                market,
                status,
                created_on,
                updated_on,
                deleted,
                group5_id,
                area_code,
                channel_code,
                liquidation,
                enable_pdp,
                payer_code,
                payer_name,
                nach_type
                )
            SELECT
                id,
                profile_id,
                city,
                postal_code,
                region_id,
                group_id,
                tse_code,
                market,
                status::TEXT::entity_status,
                created_on,
                updated_on,
                deleted,
                group5_id,
                area_code,
                channel_code,
                liquidation,
                enable_pdp,
                payer_code,
                payer_name,
                nach_type
                FROM
                staging.distributor_master_staging
            ON CONFLICT (id) DO UPDATE
            SET  
                city = EXCLUDED.city,
                postal_code = EXCLUDED.postal_code,
                region_id = EXCLUDED.region_id,
                group_id = EXCLUDED.group_id,
                group5_id = EXCLUDED.group5_id,
                tse_code = EXCLUDED.tse_code,
                market = EXCLUDED.market,
                area_code = EXCLUDED.area_code,
                channel_code = EXCLUDED.channel_code,
                deleted = false,
                payer_code = EXCLUDED.payer_code,
                payer_name = EXCLUDED.payer_name,
                nach_type = EXCLUDED.nach_type;
            DELETE FROM public.distributor_plants;
            INSERT INTO public.distributor_plants (
                distributor_id,
                plant_id,
                sales_org,
                distribution_channel,
                division,
                line_of_business,
                reference_date,
                pdp_day,
                division_description
            )
            SELECT 
                distributor_id,
                plant_id,
                sales_org,
                distribution_channel,
                division,
                line_of_business,
                reference_date,
                pdp_day,
                division_description
            FROM
                staging.distributor_plants_staging
            ON CONFLICT ON CONSTRAINT distributor_plants_ukey DO NOTHING;
            INSERT INTO mt_ecom_customer_type (
                customer_code,
                customer_type,
                customer_name
            )
            SELECT
                dms.profile_id,
                dms.grn_type,
                up."name"
            FROM
                staging.distributor_master_staging dms
            LEFT JOIN customer_group_master cgm ON
                cgm.id = dms.group_id
            LEFT JOIN staging.user_profile_staging up ON
                up.id = dms.profile_id
            WHERE
                cgm.name IN ('14', '15', '16', '28', '42')
                and dms.deleted is false  
            ON CONFLICT (customer_code)
            DO UPDATE SET
                customer_type = EXCLUDED.customer_type,
                updated_on = NOW();
            
            INSERT INTO mt_ecom_payer_code_mapping (
                customer_code,
                customer_name,
                customer_group,
                payer_code,
                payer_name,
                is_deleted
            )
            SELECT
                dms.profile_id,
                up."name",
                cgm.name,
                dms.payer_code,
                dms.payer_name,
                dms.deleted
            FROM
                staging.distributor_master_staging dms
            LEFT JOIN customer_group_master cgm ON
                cgm.id = dms.group_id
            LEFT JOIN staging.user_profile_staging up ON
                up.id = dms.profile_id
            ON CONFLICT (customer_code)
            DO UPDATE SET
                payer_code = EXCLUDED.payer_code,
                payer_name = EXCLUDED.payer_name,
                customer_group = EXCLUDED.customer_group,
                updated_on = NOW(),
                is_deleted = EXCLUDED.is_deleted; 
                
            INSERT INTO credit.distributor_base_limit_sync (
                party_code,
                party_name
            )
            SELECT dms.profile_id,
                up."name"
                FROM 
                staging.distributor_master_staging dms
                    LEFT JOIN staging.user_profile_staging up ON
                up.id = dms.profile_id
                    ON CONFLICT (party_code)
            DO UPDATE SET
                party_code = EXCLUDED.party_code,
                party_name = EXCLUDED.party_name,
                updated_on = NOW();

            DELETE FROM staging.cfa_depot_mapping_staging;
            DELETE FROM staging.distributor_plants_staging ;
            DELETE FROM staging.distributor_master_staging;
            DELETE FROM staging.user_profile_staging;
            INSERT INTO public.sync_logs
            ("type", run_at, "result", upsert_count, delete_count, created_on, updated_on, distributor_id, error_log, success_at, filename, is_cron_job, user_id, sync_uuid)
            VALUES('DISTRIBUTOR'::public.sync_type, now(), 'SUCCESS'::public.sync_result, NULL , NULL , now(), now(), NULL, NULL, NULL, NULL, false, NULL, uuid);
            ELSE
            INSERT INTO public.sync_logs 
            ("type", run_at, "result", upsert_count, delete_count, created_on, updated_on, distributor_id, error_log, success_at, filename, is_cron_job, user_id, sync_uuid)
            VALUES('DISTRIBUTOR'::public.sync_type, now(), 'FAIL'::public.sync_result, NULL , NULL , now(), now(), NULL, 'distributor_plants_staging is empty', NULL, NULL, false, NULL, uuid);
            end if;
            EXCEPTION
                WHEN OTHERS THEN
                    INSERT INTO public.sync_logs
                    ("type", run_at, "result", upsert_count, delete_count, created_on, updated_on, distributor_id, error_log, success_at, filename, is_cron_job, user_id, sync_uuid)
                    VALUES('DISTRIBUTOR'::public.sync_type, now(), 'FAIL'::public.sync_result, NULL , NULL , now(), now(), NULL, SQLERRM , NULL, NULL, false, NULL, uuid);
                END;
        $procedure$;


        
        CREATE TABLE IF NOT EXISTS audit.auto_closure_mt_so_audit_report (
            id bigserial NOT NULL,
            so_number varchar NOT NULL,
            po_number varchar NULL,
            invoice varchar NULL,
            db_code varchar NOT NULL,
            customer_type varchar NULL,
            customer_group varchar NOT NULL,
            order_date date NOT NULL,
            sales_order_type varchar NULL,
            invoice_date date NULL,
            so_validity date NULL,
            so_sent_to_sap bool DEFAULT false NOT NULL,
            material varchar NULL,
            item_status varchar NULL,
            overall_status varchar NULL,
            job_run timestamptz DEFAULT now() NOT NULL,
            created_on timestamptz DEFAULT now() NOT NULL,
            updated_on timestamptz DEFAULT now() NOT NULL,
            audit_id int8 NOT NULL,
            created_by_user varchar NULL,
            short_close_days numeric NULL,
            sap_message text NULL,
            CONSTRAINT auto_closure_mt_so_audit_report_pk PRIMARY KEY (id),
            CONSTRAINT auto_closure_mt_so_audit_report_auto_closure_mt_ecom_so_audit_f FOREIGN KEY (audit_id) REFERENCES audit.auto_closure_mt_ecom_so_audit(audit_id),
            CONSTRAINT auto_closure_mt_so_audit_report_customer_group_master_fk FOREIGN KEY (customer_group) REFERENCES public.customer_group_master("name")
        );
        CREATE UNIQUE INDEX IF NOT EXISTS auto_closure_mt_so_audit_report_unique_null_idx ON audit.auto_closure_mt_so_audit_report USING btree (so_number, COALESCE(material, ''::character varying));
        
        CREATE OR REPLACE FUNCTION audit.update_auto_closure_mt_so_audit_report()
        RETURNS trigger
        LANGUAGE plpgsql
        AS $function$
        BEGIN
            WITH process AS (
                SELECT DISTINCT
                    audit_id,
                    revision_id,
                    created_on,
                    (pd -> 'age')::jsonb #>> '{}' AS age,
                    (pd -> 'ORDERDATE')::jsonb #>> '{}' AS order_date,
                    (pd -> 'SALESORDER')::jsonb #>> '{}' AS so_number,
                    (pd -> 'SOLDTOPARTY')::jsonb #>> '{}' AS db_code,
                    (pd -> 'so_validity')::jsonb #>> '{}' AS so_validity,
                    (pd -> 'CREATEDBYUSER')::jsonb #>> '{}' AS created_by_user,
                    (pd -> 'CUSTOMERGROUP')::jsonb #>> '{}' AS customer_group,
                    (pd -> 'customer_type')::jsonb #>> '{}' AS customer_type,
                    (pd -> 'SALESORDERTYPE')::jsonb #>> '{}' AS sales_order_type,
                    (pd -> 'BILLINGDOCUMENT')::jsonb #>> '{}' AS invoice,
                    (pd -> 'BILLINGDOCUMENTDATE')::jsonb #>> '{}' AS invoice_date,
                    (pd -> 'PURCHASEORDERBYCUSTOMER')::jsonb #>> '{}' AS po_number
                FROM
                    audit.auto_closure_mt_ecom_so_audit,
                    jsonb_array_elements(process_details) AS pd
                WHERE audit_id = NEW.audit_id
            ),
            auto_closure_settings AS (
                SELECT
                    process.audit_id,
                    CASE
                        WHEN process.customer_type = 'Multi GRN' THEN COALESCE(acg.short_close_multi_grn, acga.short_close_multi_grn)
                        WHEN process.customer_type = 'Single GRN' THEN COALESCE(acg.short_close_single_grn, acga.short_close_single_grn)
                        ELSE NULL
                    END AS short_close
                FROM
                    process
                LEFT JOIN public.auto_closure_mt_ecom_config acg ON
                    acg.revision_id = process.revision_id
                LEFT JOIN audit.auto_closure_mt_ecom_config_audit acga ON
                    acga.revision_id = process.revision_id
                    AND acga.deleted = FALSE
            ),
            sap_response AS (
                SELECT
                    audit_id,
                    jsonb_array_elements(sap_response) AS response_batch
                FROM
                    audit.auto_closure_mt_ecom_so_audit acgsa
                WHERE
                    sap_response IS NOT NULL
                    AND audit_id = NEW.audit_id
            ),
            sap_response_results AS (
                SELECT
                    audit_id,
                    response_batch -> 'data' -> 'd' -> 'NAVRESULT' -> 'results' AS results
                FROM
                    sap_response
            ),
            sap_response_status AS (
                SELECT
                    audit_id,
                    (details ->> 'Material') AS material,
                    (details ->> 'Message') AS message,
                    (details ->> 'SaleOrder') AS salesorder,
                    (details ->> 'ItemNumber') AS itemnumber,
                    (details ->> 'ItemStatus') AS itemstatus,
                    (details ->> 'OverallStatus') AS overallstatus
                FROM
                    sap_response_results,
                    jsonb_array_elements(results) AS details
                WHERE
                    results IS NOT NULL
            ),
            sap AS (
                SELECT
                    audit_id,
                    rule_id,
                    revision_id,
                    (jsonb_array_elements(sap_payload) ->> 'NAVSALEORDERS')::jsonb AS navsaleorders
                FROM
                    audit.auto_closure_mt_ecom_so_audit acgsa
                WHERE
                    sap_payload IS NOT NULL
                    AND audit_id = NEW.audit_id
            ),
            sap_so AS (
                SELECT DISTINCT
                    audit_id,
                    rule_id,
                    revision_id,
                    nso ->> 'SaleOrder' AS so_number,
                    nso ->> 'DBnumber' AS db_code,
                    nso ->> 'CustomerGroup' AS customer_group
                FROM
                    sap,
                    jsonb_array_elements(navsaleorders) AS nso
            ),
            source_table AS (
                SELECT DISTINCT
                    process.db_code,
                    process.so_number,
                    process.po_number,
                    process.customer_group,
                    process.order_date::date,
                    process.customer_type,
                    process.invoice,
                    coalesce(NULLIF(process.invoice_date, 'NaT'),null)::date AS invoice_date,
                    process.sales_order_type,
                    process.so_validity::date,
                    CASE
                        WHEN ss.so_number IS NULL THEN FALSE
                        ELSE TRUE
                    END AS so_sent_to_sap,
                    srs.material,
                    srs.itemstatus,
                    srs.overallstatus,
                    process.created_on AS job_run,
                    process.audit_id,
                    process.created_by_user,
                    acs.short_close,
                    srs.message
                FROM
                    process
                INNER JOIN auto_closure_settings acs ON
                    acs.audit_id = process.audit_id
                LEFT JOIN sap_so ss ON
                    process.so_number = ss.so_number
                LEFT JOIN sap_response_status srs ON
                    process.so_number = srs.salesorder
            )
            INSERT
            INTO
            audit.auto_closure_mt_so_audit_report
            (
                    so_number,
                    po_number,
                    invoice,
                    db_code,
                    customer_type,
                    customer_group,
                    order_date,
                    sales_order_type,
                    invoice_date,
                    so_validity,
                    so_sent_to_sap,
                    material,
                    item_status,
                    overall_status,
                    job_run,
                    audit_id,
                    created_by_user,
                    short_close_days,
                    sap_message
                )
            SELECT DISTINCT ON (so_number, COALESCE(material, ''))
                src.so_number,
                src.po_number,
                src.invoice,
                src.db_code,
                src.customer_type,
                src.customer_group,
                src.order_date,
                src.sales_order_type,
                src.invoice_date,
                src.so_validity,
                src.so_sent_to_sap,
                src.material,
                src.itemstatus,
                src.overallstatus,
                src.job_run,
                src.audit_id,
                src.created_by_user,
                src.short_close,
                src.message
            FROM
                SOURCE_TABLE AS src
            ON CONFLICT (so_number, COALESCE(material, ''))
            DO UPDATE
            SET
                so_number = EXCLUDED.so_number,
                po_number = EXCLUDED.po_number,
                invoice = EXCLUDED.invoice,
                db_code = EXCLUDED.db_code,
                customer_type = EXCLUDED.customer_type,
                customer_group = EXCLUDED.customer_group,
                order_date = EXCLUDED.order_date,
                sales_order_type = EXCLUDED.sales_order_type,
                invoice_date = EXCLUDED.invoice_date,
                so_validity = EXCLUDED.so_validity,
                so_sent_to_sap = EXCLUDED.so_sent_to_sap,
                material = EXCLUDED.material,
                item_status = EXCLUDED.item_status,
                overall_status = EXCLUDED.overall_status,
                job_run = EXCLUDED.job_run,
                updated_on = now(),
                audit_id = EXCLUDED.audit_id,
                created_by_user = EXCLUDED.created_by_user,
                short_close_days = EXCLUDED.short_close_days,
                sap_message = EXCLUDED.sap_message;

            RETURN NEW;
        END;
        $function$
        ;
       DROP TRIGGER IF EXISTS trg_update_auto_closure_mt_so_audit_report ON audit.auto_closure_mt_ecom_so_audit;
        CREATE TRIGGER trg_update_auto_closure_mt_so_audit_report AFTER
        UPDATE
            OF sap_response ON
            audit.auto_closure_mt_ecom_so_audit FOR EACH ROW
            WHEN (
                (
                    new.sap_response IS DISTINCT
                FROM
                    old.sap_response
                )
            ) EXECUTE FUNCTION audit.update_auto_closure_mt_so_audit_report();

    `);
};

exports.down = (pgm) => {};
