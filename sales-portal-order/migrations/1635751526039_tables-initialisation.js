/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
    pgm.sql(`
    BEGIN;
-- Update timestamp trigger
CREATE OR REPLACE FUNCTION updateModificationTime ()
    RETURNS TRIGGER
    AS $$
BEGIN
    NEW.updated_on = NOW();
    RETURN NEW;
END;
$$
LANGUAGE 'plpgsql';
--
--
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'entity_status') THEN
    CREATE TYPE entity_status AS ENUM (
        'ACTIVE',
        'INACTIVE'
    );
    END IF;
END
$$;

CREATE TABLE IF NOT EXISTS region_master (  
    id SERIAL PRIMARY KEY,
    code varchar(50) NOT NULL,
    name_code varchar(50) NOT NULL,
    name varchar(255),
    description varchar(255),
    status entity_status NOT NULL DEFAULT 'ACTIVE',
    created_on timestamptz NOT NULL DEFAULT NOW(),
    updated_on timestamptz NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS customer_group_master (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    description VARCHAR(255),
    status entity_status NOT NULL DEFAULT 'ACTIVE',
    created_on timestamptz NOT NULL DEFAULT NOW(),
    updated_on timestamptz NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS plant_master (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    description VARCHAR(255),
    status entity_status NOT NULL DEFAULT 'ACTIVE',
    created_on timestamptz NOT NULL DEFAULT NOW(),
    updated_on timestamptz NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS material_master (
    code bigINT PRIMARY KEY,
    description VARCHAR(255) NOT NULL,
    sales_unit VARCHAR(5),
    pak_code VARCHAR(5),
    pak_type VARCHAR(12),
    status entity_status NOT NULL DEFAULT 'ACTIVE',
    created_on timestamptz NOT NULL DEFAULT NOW(),
    updated_on timestamptz NULL DEFAULT NOW()
);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'sales_hierarchy_level') THEN
    CREATE TYPE sales_hierarchy_level AS ENUM (
        'CPSM',
        'NSM',
        'CSM',
        'RSM',
        'ASM',
        'TSE'
    );
    END IF;
END
$$;

CREATE TABLE IF NOT EXISTS  sales_hierarchy  (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) NOT NULL,
    name VARCHAR(50) NOT NULL,
    level sales_hierarchy_level NOT NULL,
    parent_id INT NULL,
    created_on timestamptz NOT NULL DEFAULT NOW(),
    updated_on timestamptz NULL DEFAULT NOW(),
    FOREIGN KEY (parent_id) REFERENCES sales_hierarchy (id) ON DELETE CASCADE
);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_type') THEN
    CREATE TYPE user_type AS ENUM (
        'DISTRIBUTOR',
        'ASM'
    );
    END IF;
END
$$;

CREATE TABLE IF NOT EXISTS  user_profile  (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255),
    mobile VARCHAR(20),
    password VARCHAR(255),
    type user_type,
    created_on timestamptz NOT NULL DEFAULT NOW(),
    updated_on timestamptz NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS distributor_master (
    id INT PRIMARY KEY,
    profile_id INT NULL,
    city VARCHAR(255),
    postal_code INT,
    region_id INT,
    group_id INT,
    tse_code VARCHAR(15),
    pdp_day VARCHAR(15),
    market VARCHAR(255),
    status entity_status NOT NULL DEFAULT 'ACTIVE',
    created_on timestamptz NOT NULL DEFAULT NOW(),
    updated_on timestamptz NULL DEFAULT NOW(),
    FOREIGN KEY (region_id) REFERENCES region_master (id),
    FOREIGN KEY (group_id) REFERENCES customer_group_master (id),
    FOREIGN KEY (profile_id) REFERENCES user_profile (id)
);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'docking_type') THEN
    CREATE TYPE docking_type AS ENUM (
        'SHIPPING_POINT',
        'UNLOADING_POINT'
    );
    END IF;
END
$$;


CREATE TABLE IF NOT EXISTS orders  (
    id SERIAL PRIMARY KEY,
    distributor_id INT NOT NULL,
    po_period VARCHAR (6) NOT NULL,
    po_number VARCHAR (255) NOT NULL,
    so_number VARCHAR(50) NOT NULL,
    so_date timestamptz,
    status entity_status NOT NULL DEFAULT 'ACTIVE',
    created_on timestamptz NOT NULL DEFAULT NOW(),
    updated_on timestamptz NULL,
    FOREIGN KEY (distributor_id) REFERENCES distributor_master (id)
);

CREATE TABLE IF NOT EXISTS warehouse_details  (
    id SERIAL PRIMARY KEY,
    distributor_id INT NOT NULL,
    sales_org INT NOT NULL,
    distrbution_channel INT NOT NULL,
    division INT NOT NULL,
    type docking_type NOT NULL,
    partner_name VARCHAR(100) NOT NULL,
    partner_code VARCHAR(100) NOT NULL,
    FOREIGN KEY (distributor_id) REFERENCES distributor_master (id),
    created_on timestamptz NOT NULL DEFAULT NOW(),
    updated_on timestamptz NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS otp  (
    id SERIAL PRIMARY KEY,
    distributor_id INT NOT NULL,
    mobile_number VARCHAR(15) NOT NULL,
    otp_code INT NOT NULL,
    created_on timestamptz NOT NULL DEFAULT NOW(),
    expires_at timestamptz,
    refrence_code VARCHAR(200),
    FOREIGN KEY (distributor_id) REFERENCES distributor_master (id)
);

CREATE TABLE IF NOT EXISTS distributor_plants  (
    id SERIAL PRIMARY KEY,
    distributor_id int NOT NULL,
    plant_id int NOT NULL,
    FOREIGN KEY (distributor_id) REFERENCES distributor_master (id),
    FOREIGN KEY (plant_id) REFERENCES plant_master (id)
);

COMMIT;
    `);
};

exports.down = pgm => {
    pgm.sql(`
    DROP TABLE region_master;
    DROP TABLE customer_group_master;
    DROP TABLE plant_master;
    DROP TABLE material_master;    ;
    DROP TABLE sales_hierarchy;
    DROP TABLE user_profile;
    DROP TABLE distributor_master;
    DROP TABLE orders;
    DROP TABLE warehouse_details;
    DROP TABLE otp;
    DROP TABLE distributor_plants;

    DROP TYPE entity_status;
    DROP TYPE sales_hierarchy_level;
    DROP TYPE user_type;
    DROP TYPE docking_type;
    `);
};
