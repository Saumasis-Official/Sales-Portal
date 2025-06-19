/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = (pgm) => {
    pgm.sql(`
        -- DROP PROCEDURE public.distributor_sync_proc(text);

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
                cgm.name IN ('14', '15', '16', '28', '42', '69', '70')
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
        $procedure$
;
        `);

    pgm.sql(`
        UPDATE
            public.auto_closure_gt
        SET
            deleted = TRUE,
            updated_on = now()
        WHERE
            customer_group IN (
                '69', '70'
            )
        `);

    pgm.sql(`
        INSERT INTO public.auto_closure_mt_ecom_config (customer_group)
        VALUES ('69'), ('70')
        ON CONFLICT (customer_group) DO NOTHING;
        `);
};

exports.down = (pgm) => {};
