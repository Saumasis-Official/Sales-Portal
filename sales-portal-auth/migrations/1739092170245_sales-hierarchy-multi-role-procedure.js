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
                ARRAY[roles]::TEXT[]::public.roles_type[],
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
        `);

};

exports.down = pgm => {};
