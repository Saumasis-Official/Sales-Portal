/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
    pgm.sql(`
        -- SALES_HIERARCHY SYNC
        CREATE OR REPLACE PROCEDURE public.sales_hierarchy_sync_proc(IN uuid text)
            LANGUAGE plpgsql
            AS $procedure$
            declare 

            P_CHK integer;
                begin
                INSERT INTO public.sales_hierarchy_details (
                user_id,
                first_name,
                last_name,
                email,
                mobile_number,
                manager_id,
                code,
                created_on,
                updated_on,
                deleted,
                roles,
                status,
                cfa_email,
                cfa_contact_person,
                cfa_contact_number
            )
            SELECT 
                user_id,
                first_name,
                last_name,
                email,
                mobile_number,
                manager_id,
                code,
                created_on,
                updated_on,
                deleted,
                roles::TEXT::public.roles_type,
                status::TEXT::public.entity_status,
                cfa_email,
                cfa_contact_person,
                cfa_contact_number
            FROM
                staging.sales_hierarchy_details_staging
            ON CONFLICT (user_id) DO UPDATE
            SET
                first_name = excluded.first_name,
                last_name = excluded.last_name,
                email = excluded.email,
                mobile_number = excluded.mobile_number,
                manager_id = excluded.manager_id,
                code = excluded.code,
                deleted = false;

            INSERT INTO public.sync_logs
            ("type", run_at, "result", upsert_count, delete_count, created_on, updated_on, distributor_id, error_log, success_at, filename, is_cron_job, user_id, sync_uuid)
            VALUES('SALES_HIER'::public.sync_type, now(), 'SUCCESS'::public.sync_result, NULL , NULL , now(), now(), NULL, NULL, NULL, NULL, false, NULL, uuid);

            DELETE FROM staging.sales_hierarchy_details_staging ;

            EXCEPTION
                WHEN OTHERS THEN
                    INSERT INTO public.sync_logs
                    ("type", run_at, "result", upsert_count, delete_count, created_on, updated_on, distributor_id, error_log, success_at, filename, is_cron_job, user_id, sync_uuid)
                    VALUES('SALES_HIER'::public.sync_type, now(), 'FAIL'::public.sync_result, NULL , NULL , now(), now(), NULL, SQLERRM , NULL, NULL, false, NULL, uuid);
                end;
            $procedure$
            ;

        -- MATERIAL_SYNC Procedure
        CREATE OR REPLACE PROCEDURE public.material_sync_proc(IN uuid text)
            LANGUAGE plpgsql
            AS $procedure$
            declare 
            P_CHK integer;
                begin
                    
                    select 1 into P_CHK from staging.material_sales_details_staging;
                if P_CHK = 1 then
                    INSERT INTO public.material_master (
                code,
                description,
                sales_unit,
                pak_code,
                pak_type,
                status,
                created_on,
                updated_on,
                textsearchable_index_col,
                deleted,
                tags,
                start_date,
                appl_area_channel,
                product_hierarchy_code,
                buom_to_cs,
                pak_to_cs,
                brand,
                brand_desc,
                brand_variant,
                brand_variant_desc,
                ton_to_suom,
                buom
            )
            SELECT
                code,
                description,
                sales_unit,
                pak_code,
                pak_type,
                status::TEXT::public.entity_status,
                created_on,
                updated_on,
                textsearchable_index_col,
                deleted,
                tags,
                start_date,
                appl_area_channel,
                product_hierarchy_code,
                buom_to_cs,
                pak_to_cs,
                brand,
                brand_desc,
                brand_variant,
                brand_variant_desc,
                ton_to_suom,
                buom
            FROM
                staging.material_master_staging
            ON CONFLICT (code) DO UPDATE
            SET
                description = excluded.description,
                sales_unit = excluded.sales_unit,
                pak_type = excluded.pak_type,
                product_hierarchy_code = excluded.product_hierarchy_code,
                buom_to_cs = excluded.buom_to_cs,
                pak_to_cs = excluded.pak_to_cs,
                brand = excluded.brand,
                brand_desc = excluded.brand_desc,
                brand_variant = excluded.brand_variant,
                brand_variant_desc = excluded.brand_variant_desc,
                ton_to_suom = excluded.ton_to_suom,
                buom = excluded.buom,
                deleted = FALSE;

            DELETE FROM public.material_sales_details;

            INSERT INTO public.material_sales_details (
                material_code,
                sales_org,
                distribution_channel,
                division,
                line_of_business,
                unit_of_measurement,
                conversion_factor
            )
            SELECT
                material_code,
                sales_org,
                distribution_channel,
                division,
                line_of_business,
                unit_of_measurement,
                conversion_factor
            FROM
                staging.material_sales_details_staging;

            DELETE FROM staging.material_sales_details_staging;
            DELETE FROM staging.material_master_staging ;

            INSERT INTO public.sync_logs 
                ("type", run_at, "result", upsert_count, delete_count, created_on, updated_on, distributor_id, error_log, success_at, filename, is_cron_job, user_id, sync_uuid)
                VALUES('MATERIAL'::public.sync_type, now(), 'SUCCESS'::public.sync_result, NULL , NULL , now(), now(), NULL, NULL, NULL, NULL, false, NULL, uuid);


            ELSE
                INSERT INTO public.sync_logs 
                ("type", run_at, "result", upsert_count, delete_count, created_on, updated_on, distributor_id, error_log, success_at, filename, is_cron_job, user_id, sync_uuid)
                VALUES('MATERIAL'::public.sync_type, now(), 'FAIL'::public.sync_result, NULL , NULL , now(), now(), NULL, 'material_sales_details_staging is empty', NULL, NULL, false, NULL, uuid);

            end if;
                EXCEPTION WHEN OTHERS THEN 
                    INSERT INTO public.sync_logs
                    ("type", run_at, "result", upsert_count, delete_count, created_on, updated_on, distributor_id, error_log, success_at, filename, is_cron_job, user_id, sync_uuid)
                    VALUES('MATERIAL'::public.sync_type, now(), 'FAIL'::public.sync_result, NULL , NULL , now(), now(), NULL, SQLERRM , NULL, NULL, false, NULL, uuid);

                end;
            $procedure$
            ;

        -- DB Sync Procedure
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
                enable_pdp 
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
                enable_pdp
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
                deleted = false;

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
    `)
};

exports.down = pgm => {};
