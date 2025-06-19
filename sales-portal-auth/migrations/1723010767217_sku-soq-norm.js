/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
    // Add new enum values
    pgm.sql(`
        DO $$
        BEGIN
            BEGIN
                IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'SKU_SOQ_NORM' AND enumtypid = 'sync_type'::regtype) THEN
                    ALTER TYPE sync_type ADD VALUE 'SKU_SOQ_NORM';
                END IF;
            EXCEPTION
                WHEN duplicate_object THEN null;
            END;
        END
        $$;
    `);

    pgm.sql(`
        DO $$
        BEGIN
            BEGIN
                IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'DISTRIBUTOR_CENSUS_CUSTOMER_GROUP' AND enumtypid = 'sync_type'::regtype) THEN
                    ALTER TYPE sync_type ADD VALUE 'DISTRIBUTOR_CENSUS_CUSTOMER_GROUP';
                END IF;
            EXCEPTION
                WHEN duplicate_object THEN null;
            END;
        END
        $$;
    `);

    // Insert into sync_logs
    // pgm.sql(`
    //     INSERT INTO sync_logs (
    //         "type",
    //         run_at,
    //         "result",
    //         success_at
    //     ) VALUES 
    //     ('SKU_SOQ_NORM', now(), 'SUCCESS', NOW() ),
    //     ('DISTRIBUTOR_CENSUS_CUSTOMER_GROUP', now(), 'SUCCESS', NOW() )
    //     ON CONFLICT (id) DO NOTHING;
    // `);

    // Create tables
    pgm.sql(`
        CREATE TABLE public.sku_soq_norm (
            id bigserial NOT NULL,
            material_code varchar NOT NULL,
            metro numeric NULL,
            tlp numeric NULL,
            olp numeric NULL,
            flp numeric NULL,
            created_on timestamptz DEFAULT now() NOT NULL,
            updated_on timestamptz DEFAULT now() NOT NULL,
            updated_by varchar DEFAULT 'PORTAL_MANAGED'::character varying NOT NULL,
            deleted bool DEFAULT false NOT NULL,
            CONSTRAINT sku_soq_norm_pk PRIMARY KEY (id),
            CONSTRAINT sku_soq_norm_unique UNIQUE (material_code),
            CONSTRAINT sku_soq_norm_material_master_fk FOREIGN KEY (material_code) REFERENCES public.material_master(code)
        );
    `);

    pgm.sql(`
        CREATE TABLE public.distributor_census_customer_group (
            id bigserial NOT NULL,
            distributor_code varchar NOT NULL,
            customer_group varchar NOT NULL,
            created_on timestamp DEFAULT now() NOT NULL,
            updated_on timestamptz DEFAULT now() NOT NULL,
            updated_by varchar DEFAULT 'PORTAL_MANAGED'::character varying NOT NULL,
            pop_class text NOT NULL,
            CONSTRAINT distributor_census_customer_group_pk PRIMARY KEY (id),
            CONSTRAINT distributor_census_customer_group_unique UNIQUE (distributor_code),
            CONSTRAINT distributor_census_customer_group_distributor_master_fk FOREIGN KEY (distributor_code) REFERENCES public.distributor_master(id)
        );
    `);

    pgm.sql(`
        ALTER TABLE IF EXISTS ars_forecast_total ADD COLUMN area_forecast _jsonb;
        `);
};

exports.down = pgm => {
    pgm.sql(`
        DROP TABLE IF EXISTS public.sku_soq_norm;
        DROP TABLE IF EXISTS public.distributor_census_customer_group;
    `);
};