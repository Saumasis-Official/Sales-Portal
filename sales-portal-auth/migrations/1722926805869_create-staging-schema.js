/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
    pgm.sql(`
        CREATE SCHEMA IF NOT EXISTS "staging" AUTHORIZATION tcpl_sales_orders_user;

        -- Types
        CREATE TYPE "staging".entity_status AS ENUM (
            'ACTIVE',
            'INACTIVE'
        );

        CREATE TYPE staging.user_type AS ENUM (
            'DISTRIBUTOR',
            'ASM'
        );

        CREATE TYPE staging.roles_type AS ENUM (
            'SUPER_ADMIN',
            'DIST_ADMIN',
            'TSE',
            'SUPPORT',
            'CFA',
            'LOGISTIC_OFFICER',
            'ZONAL_OFFICER',
            'ASM',
            'OPERATIONS',
            'RSM',
            'MDM',
            'KAMS',
            'SHOPPER_MARKETING',
            'PORTAL_OPERATIONS',
            'CLUSTER_MANAGER',
            'FINANCE',
            'VP',
            'NKAMS'
        );
        
        --Tables for Db sync

        CREATE TABLE IF NOT EXISTS staging.group5_master_staging (
            id serial4 NOT NULL,
            "name" varchar(50) NOT NULL,
            description varchar(255) NULL,
            status staging.entity_status DEFAULT 'ACTIVE'::staging.entity_status NOT NULL,
            created_on timestamptz DEFAULT now() NOT NULL,
            updated_on timestamptz DEFAULT now() NULL,
            rsm_code varchar(6) NULL,
	        cluster_code varchar(6) NULL,
            CONSTRAINT group5_master_staging_pkey PRIMARY KEY (id),
            CONSTRAINT group5_master_staging_ukey UNIQUE (name)
        );

        CREATE TABLE IF NOT EXISTS staging.customer_group_master_staging (
            id serial4 NOT NULL,
            "name" varchar(50) NOT NULL,
            description varchar(255) NULL,
            status staging.entity_status DEFAULT 'ACTIVE'::staging.entity_status NOT NULL,
            created_on timestamptz DEFAULT now() NOT NULL,
            updated_on timestamptz DEFAULT now() NULL,
            pdp_update_enabled bool DEFAULT false NULL,
            CONSTRAINT customer_group_master_staging_pkey PRIMARY KEY (id),
            CONSTRAINT customer_group_master_staging_ukey UNIQUE (name)
        );

        CREATE TABLE IF NOT EXISTS staging.user_profile_staging (
            id varchar(20) NOT NULL,
            "name" varchar(100) NOT NULL,
            email varchar(255) NULL,
            mobile varchar(13) NULL,
            "password" varchar(255) NULL,
            "type" staging.user_type NOT NULL,
            created_on timestamptz DEFAULT now() NOT NULL,
            updated_on timestamptz DEFAULT now() NULL,
            CONSTRAINT user_profile_staging_pkey PRIMARY KEY (id)
        );

        CREATE TABLE IF NOT EXISTS staging.plant_master_staging (
            id serial4 NOT NULL,
            "name" varchar(50) NOT NULL,
            description varchar(255) NULL,
            status staging.entity_status DEFAULT 'ACTIVE'::staging.entity_status NOT NULL,
            created_on timestamptz DEFAULT now() NOT NULL,
            updated_on timestamptz DEFAULT now() NULL,
            CONSTRAINT plant_master_staging_pkey PRIMARY KEY (id),
            CONSTRAINT plant_master_staging_ukey UNIQUE (name)
        );

        CREATE TABLE IF NOT EXISTS staging.region_master_staging (
            id serial4 NOT NULL,
            code varchar(50) NOT NULL,
            description varchar(255) NULL,
            status staging.entity_status DEFAULT 'ACTIVE'::staging.entity_status NOT NULL,
            created_on timestamptz DEFAULT now() NOT NULL,
            updated_on timestamptz DEFAULT now() NULL,
            CONSTRAINT region_master_staging_pkey PRIMARY KEY (id),
            CONSTRAINT region_master_staging_ukey UNIQUE (code)
        );

        CREATE TABLE IF NOT EXISTS staging.distributor_master_staging (
            id varchar(20) NOT NULL,
            profile_id varchar(20) NULL,
            city varchar(50) NULL,
            postal_code int4 NULL,
            region_id int4 NULL,
            group_id int4 NULL,
            tse_code varchar(15) NULL,
            market varchar(255) NULL,
            status staging.entity_status DEFAULT 'ACTIVE'::staging.entity_status NOT NULL,
            created_on timestamptz DEFAULT now() NOT NULL,
            updated_on timestamptz DEFAULT now() NULL,
            deleted bool DEFAULT false NULL,
            group5_id int4 NULL,
            area_code varchar(10) DEFAULT NULL::character varying NULL,
            channel_code varchar(5) DEFAULT NULL::character varying NULL,
            liquidation bool DEFAULT false NULL,
            enable_pdp bool DEFAULT false NULL,
            ao_enable bool DEFAULT false NULL,
            reg_enable bool DEFAULT true NULL,
            ro_enable bool DEFAULT false NULL,
            bo_enable bool DEFAULT false NULL,
            pdp_unlock_id varchar NULL,
            CONSTRAINT distributor_master_staging_pkey PRIMARY KEY (id),
            CONSTRAINT distributor_master_staging_group5_id_fkey FOREIGN KEY (group5_id) REFERENCES staging.group5_master_staging(id),
            CONSTRAINT distributor_master_staging_group_id_fkey FOREIGN KEY (group_id) REFERENCES staging.customer_group_master_staging(id),
            CONSTRAINT distributor_master_staging_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES staging.user_profile_staging(id)
        );

        CREATE TABLE IF NOT EXISTS staging.cfa_depot_mapping_staging (
            id serial4 NOT NULL,
            "zone" varchar(15) NULL,
            depot_code varchar(4) NOT NULL,
            sales_org int4 NOT NULL,
            distribution_channel int4 NOT NULL,
            division int4 NOT NULL,
            "location" varchar(55) NULL,
            "name" varchar(55) NOT NULL,
            address varchar(255) NULL,
            email varchar(55) NOT NULL,
            contact_person varchar(255) NOT NULL,
            contact_number varchar(50) NULL,
            zone_manager_email varchar(255) NULL,
            cluster_manager_email varchar(255) NULL,
            is_deleted bool DEFAULT false NULL,
            created_on timestamptz DEFAULT now() NOT NULL,
            updated_on timestamptz DEFAULT now() NULL,
            logistic_email varchar(255) DEFAULT NULL::character varying NULL,
            updated_by varchar(15) NULL,
            remarks text NULL,
            group5_id int4 NULL,
            CONSTRAINT cfa_depot_mapping_depot_code_sales_org_distribution_channel_key UNIQUE (depot_code, sales_org, distribution_channel, division),
            CONSTRAINT cfa_depot_mapping_staging_pkey PRIMARY KEY (id),
            CONSTRAINT cfa_depot_mapping_staging_fk FOREIGN KEY (group5_id) REFERENCES staging.group5_master_staging(id),
            CONSTRAINT zone_id_fk FOREIGN KEY (group5_id) REFERENCES staging.group5_master_staging(id)
        );

        CREATE TABLE IF NOT EXISTS staging.distributor_plants_staging (
            id serial4 NOT NULL,
            distributor_id varchar(20) NOT NULL,
            plant_id int4 NOT NULL,
            sales_org int4 NULL,
            distribution_channel int4 NULL,
            division int4 NULL,
            line_of_business int4 NULL,
            reference_date varchar NULL,
            pdp_day varchar NULL,
            division_description varchar NULL,
            CONSTRAINT distributor_plants_staging_pkey PRIMARY KEY (id),
            CONSTRAINT distributor_plants_staging_ukey UNIQUE (distributor_id, plant_id, sales_org, distribution_channel, division, line_of_business),
            CONSTRAINT distributor_plants_staging_distributor_id_fkey FOREIGN KEY (distributor_id) REFERENCES staging.distributor_master_staging(id),
            CONSTRAINT distributor_plants_staging_plant_id_fkey FOREIGN KEY (plant_id) REFERENCES staging.plant_master_staging(id)
        );

        -- Tables for Material Sync
        CREATE TABLE IF NOT EXISTS staging.material_master_staging (
            code varchar(18) NOT NULL,
            description varchar(255) NOT NULL,
            sales_unit varchar(5) DEFAULT NULL::character varying NULL,
            pak_code varchar(15) DEFAULT NULL::character varying NULL,
            pak_type varchar(12) NULL,
            status staging.entity_status DEFAULT 'ACTIVE'::staging.entity_status NOT NULL,
            created_on timestamptz DEFAULT now() NOT NULL,
            updated_on timestamptz DEFAULT now() NULL,
            textsearchable_index_col tsvector NULL,
            deleted bool DEFAULT false NULL,
            tags jsonb NULL,
            start_date date NULL,
            appl_area_channel _jsonb NULL,
            product_hierarchy_code text NULL,
            buom_to_cs numeric NULL,
            pak_to_cs numeric NULL,
            brand text NULL,
            brand_desc text NULL,
            brand_variant text NULL,
            brand_variant_desc text NULL,
            ton_to_suom numeric NULL,
            buom varchar NULL,
            CONSTRAINT material_master_staging_pkey PRIMARY KEY (code)
        );
        CREATE INDEX textsearch_idx ON staging.material_master_staging USING gin (textsearchable_index_col);

        CREATE TABLE IF NOT EXISTS staging.material_sales_details_staging (
            id serial4 NOT NULL,
            material_code varchar NOT NULL,
            sales_org int4 NULL,
            distribution_channel int4 NULL,
            division int4 NULL,
            line_of_business varchar NULL,
            unit_of_measurement varchar NULL,
            conversion_factor varchar NULL,
            CONSTRAINT material_sales_details_staging_pkey PRIMARY KEY (id),
            CONSTRAINT material_sales_details_staging_material_code_fkey FOREIGN KEY (material_code) REFERENCES staging.material_master_staging(code)
        );

        CREATE TABLE staging.sales_hierarchy_details_staging (
            user_id varchar(20) NOT NULL,
            first_name varchar(50) DEFAULT NULL::character varying NULL,
            last_name varchar(50) DEFAULT NULL::character varying NULL,
            email varchar(255) DEFAULT NULL::character varying NULL,
            mobile_number varchar(20) DEFAULT NULL::character varying NULL,
            manager_id varchar(20) NULL,
            code varchar(50) NULL,
            created_on timestamptz DEFAULT now() NOT NULL,
            updated_on timestamptz DEFAULT now() NULL,
            deleted bool DEFAULT false NULL,
            roles staging.roles_type DEFAULT 'TSE'::staging.roles_type NOT NULL,
            status staging.entity_status DEFAULT 'ACTIVE'::staging.entity_status NOT NULL,
            cfa_email varchar(55) NULL,
            cfa_contact_person varchar(255) NULL,
            cfa_contact_number varchar(16) NULL,
            CONSTRAINT sales_hierarchy_details_staging_pkey PRIMARY KEY (user_id)
        );

        INSERT INTO staging.plant_master_staging (id, "name", description, status, created_on, updated_on) 
        SELECT id,"name",description, status::TEXT::staging.entity_status, now(),now() FROM public.plant_master;

        SELECT setval('staging.plant_master_staging_id_seq', (SELECT max(id) FROM staging.plant_master_staging)); 

        INSERT INTO staging.region_master_staging (id, code, description, status, created_on, updated_on)
        SELECT id, code, description, status::TEXT::staging.entity_status, now(), now() from public.region_master;

        SELECT setval('staging.region_master_staging_id_seq', (SELECT max(id) FROM staging.region_master_staging)); 

        INSERT INTO staging.customer_group_master_staging (id, "name", description, status, created_on, updated_on, pdp_update_enabled)
        SELECT id, "name", description, status::TEXT::staging.entity_status, now(), now(), pdp_update_enabled from public.customer_group_master;

        SELECT setval('staging.customer_group_master_staging_id_seq', (SELECT max(id) FROM staging.customer_group_master_staging)); 

        INSERT INTO staging.group5_master_staging (id, "name", description, status, created_on, updated_on, cluster_code, rsm_code)
        SELECT id, name, description, status::TEXT::staging.entity_status, now(), now(), cluster_code, rsm_code FROM public.group5_master;

        SELECT setval('staging.group5_master_staging_id_seq', (SELECT max(id) FROM staging.group5_master_staging)); 

    `)
};

exports.down = pgm => { };
