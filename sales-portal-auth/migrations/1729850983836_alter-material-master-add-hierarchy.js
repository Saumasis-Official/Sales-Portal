/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
    pgm.sql(`

        CREATE TABLE IF NOT EXISTS public.ars_tolerance_distributor_material (
            id bigserial NOT NULL,
            tse_code varchar NULL,
            customer_group varchar NULL,
            distributor_code varchar NULL,
            product_hierarchy varchar NULL,
            psku varchar NULL,
            max numeric NULL,
            min numeric NULL,
            created_by varchar DEFAULT 'PORTAL_MANAGED'::character varying NOT NULL,
            created_on timestamptz DEFAULT now() NOT NULL,
            updated_by varchar NULL,
            updated_on timestamptz NULL,
            deleted bool DEFAULT false NOT NULL,
            revision_id numeric DEFAULT 1 NOT NULL,
            CONSTRAINT ars_tolerance_distributor_material_pk PRIMARY KEY (id)
        );

        CREATE TABLE IF NOT EXISTS audit.ars_tolerance_distributor_material_audit (
            audit_id bigserial PRIMARY KEY,
            action_type varchar(10) NOT NULL,
            action_timestamp timestamptz DEFAULT now() NOT NULL,
            id bigserial,
            tse_code varchar,
            customer_group varchar,
            distributor_code varchar,
            product_hierarchy varchar,
            psku varchar,
            max numeric,
            min numeric,
            created_by varchar,
            created_on timestamptz,
            updated_by varchar,
            updated_on timestamptz,
            deleted bool,
            revision_id numeric
        );

        CREATE OR REPLACE FUNCTION public.ars_tolerance_distributor_material_audit_func()
        RETURNS TRIGGER AS $$
        BEGIN
            IF TG_OP = 'INSERT' THEN
                INSERT INTO audit.ars_tolerance_distributor_material_audit (
                    action_type,
                    id,
                    tse_code,
                    customer_group,
                    distributor_code,
                    product_hierarchy,
                    psku,
                    max,
                    min,
                    created_by,
                    created_on,
                    updated_by,
                    updated_on,
                    deleted,
                    revision_id
                ) VALUES (
                    'INSERT',
                    NEW.id,
                    NEW.tse_code,
                    NEW.customer_group,
                    NEW.distributor_code,
                    NEW.product_hierarchy,
                    NEW.psku,
                    NEW.max,
                    NEW.min,
                    NEW.created_by,
                    NEW.created_on,
                    NEW.updated_by,
                    NEW.updated_on,
                    NEW.deleted,
                    NEW.revision_id
                );
                RETURN NEW;
            ELSIF TG_OP = 'UPDATE' THEN
                INSERT INTO audit.ars_tolerance_distributor_material_audit (
                    action_type,
                    id,
                    tse_code,
                    customer_group,
                    distributor_code,
                    product_hierarchy,
                    psku,
                    max,
                    min,
                    created_by,
                    created_on,
                    updated_by,
                    updated_on,
                    deleted,
                    revision_id
                ) VALUES (
                    'UPDATE',
                    OLD.id,
                    OLD.tse_code,
                    OLD.customer_group,
                    OLD.distributor_code,
                    OLD.product_hierarchy,
                    OLD.psku,
                    OLD.max,
                    OLD.min,
                    OLD.created_by,
                    OLD.created_on,
                    OLD.updated_by,
                    OLD.updated_on,
                    OLD.deleted,
                    OLD.revision_id
                );
                RETURN NEW;
            ELSIF TG_OP = 'DELETE' THEN
                INSERT INTO audit.ars_tolerance_distributor_material_audit (
                    action_type,
                    id,
                    tse_code,
                    customer_group,
                    distributor_code,
                    product_hierarchy,
                    psku,
                    max,
                    min,
                    created_by,
                    created_on,
                    updated_by,
                    updated_on,
                    deleted,
                    revision_id
                ) VALUES (
                    'DELETE',
                    OLD.id,
                    OLD.tse_code,
                    OLD.customer_group,
                    OLD.distributor_code,
                    OLD.product_hierarchy,
                    OLD.psku,
                    OLD.max,
                    OLD.min,
                    OLD.created_by,
                    OLD.created_on,
                    OLD.updated_by,
                    OLD.updated_on,
                    OLD.deleted,
                    OLD.revision_id
                );
                RETURN OLD;
            END IF;
        END;
        $$ LANGUAGE plpgsql;

        -- Create the trigger for AFTER INSERT
        CREATE TRIGGER ars_tolerance_distributor_material_audit_trigger_insert
        AFTER INSERT
        ON public.ars_tolerance_distributor_material
        FOR EACH ROW
        EXECUTE FUNCTION public.ars_tolerance_distributor_material_audit_func();

        -- Create the trigger for BEFORE UPDATE
        CREATE TRIGGER ars_tolerance_distributor_material_audit_trigger_update
        BEFORE UPDATE
        ON public.ars_tolerance_distributor_material
        FOR EACH ROW
        EXECUTE FUNCTION public.ars_tolerance_distributor_material_audit_func();

        -- Create the trigger for BEFORE DELETE
        CREATE TRIGGER ars_tolerance_distributor_material_audit_trigger_delete
        BEFORE DELETE
        ON public.ars_tolerance_distributor_material
        FOR EACH ROW
        EXECUTE FUNCTION public.ars_tolerance_distributor_material_audit_func();

        --This unique key ensures that null values are not duplicated
        CREATE UNIQUE INDEX IF NOT EXISTS unique_tolerance_distributor_material
        ON ars_tolerance_distributor_material (
            COALESCE(tse_code, ''),
            COALESCE(customer_group, ''),
            COALESCE(distributor_code, ''),
            COALESCE(product_hierarchy, ''),
            COALESCE(psku, '')
        );

        ALTER TABLE staging.material_master_staging add column global_brand text;
        ALTER TABLE staging.material_master_staging add column global_brand_desc text;
        ALTER TABLE staging.material_master_staging add column variant text;
        ALTER TABLE staging.material_master_staging add column variant_desc text;
        ALTER TABLE staging.material_master_staging add column product text;
        ALTER TABLE staging.material_master_staging add column product_desc text;
        ALTER TABLE staging.material_master_staging add column category text;
        ALTER TABLE staging.material_master_staging add column category_desc text;
        
        ALTER TABLE public.material_master add column global_brand text;
        ALTER TABLE public.material_master add column global_brand_desc text;
        ALTER TABLE public.material_master add column variant text;
        ALTER TABLE public.material_master add column variant_desc text;
        ALTER TABLE public.material_master add column product text;
        ALTER TABLE public.material_master add column product_desc text;
        ALTER TABLE public.material_master add column category text;
        ALTER TABLE public.material_master add column category_desc text;

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
                buom,
                global_brand,
                global_brand_desc,
                variant,
                variant_desc,
                product,
                product_desc,
                category,
                category_desc
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
                buom,
                global_brand,
                global_brand_desc,
                variant,
                variant_desc,
                product,
                product_desc,
                category,
                category_desc
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
                global_brand = EXCLUDED.global_brand,
                global_brand_desc = EXCLUDED.global_brand_desc,
                variant = EXCLUDED.variant ,
                variant_desc = EXCLUDED.variant_desc,
                product = EXCLUDED.product,
                product_desc = EXCLUDED.product_desc,
                category = EXCLUDED.category,
                category_desc = EXCLUDED.category_desc,
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
        `);
};

exports.down = pgm => {};
