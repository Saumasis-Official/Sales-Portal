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
CREATE TYPE entity_status AS ENUM (
    'ACTIVE',
    'INACTIVE'
);
CREATE TABLE region_master (  
    id SERIAL PRIMARY KEY,
    code varchar(50) NOT NULL,
    name_code varchar(50) NOT NULL,
    name varchar(255),
    description varchar(255),
    status entity_status NOT NULL DEFAULT 'ACTIVE',
    created_on timestamptz NOT NULL DEFAULT NOW(),
    updated_on timestamptz NULL DEFAULT NOW()
);
CREATE TABLE customer_group_master (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    description VARCHAR(255),
    status entity_status NOT NULL DEFAULT 'ACTIVE',
    created_on timestamptz NOT NULL DEFAULT NOW(),
    updated_on timestamptz NULL DEFAULT NOW()
);
CREATE TABLE plant_master (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    description VARCHAR(255),
    status entity_status NOT NULL DEFAULT 'ACTIVE',
    created_on timestamptz NOT NULL DEFAULT NOW(),
    updated_on timestamptz NULL DEFAULT NOW()
);
CREATE TABLE material_master (
    code bigINT PRIMARY KEY,
    description VARCHAR(255) NOT NULL,
    sales_unit VARCHAR(5),
    pak_code VARCHAR(5),
    pak_type VARCHAR(12),
    status entity_status NOT NULL DEFAULT 'ACTIVE',
    created_on timestamptz NOT NULL DEFAULT NOW(),
    updated_on timestamptz NULL DEFAULT NOW()
);
CREATE TYPE sales_hierarchy_level AS ENUM (
    'CPSM',
    'NSM',
    'CSM',
    'RSM',
    'ASM',
    'TSE'
);
CREATE TABLE sales_hierarchy (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) NOT NULL,
    name VARCHAR(50) NOT NULL,
    level sales_hierarchy_level NOT NULL,
    parent_id INT NULL,
    created_on timestamptz NOT NULL DEFAULT NOW(),
    updated_on timestamptz NULL DEFAULT NOW(),
    FOREIGN KEY (parent_id) REFERENCES sales_hierarchy (id) ON DELETE CASCADE
);
CREATE TYPE user_type AS ENUM (
    'DISTRIBUTOR',
    'ASM'
);
CREATE TABLE user_profile (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255),
    mobile VARCHAR(20),
    password VARCHAR(255),
    type user_type,
    created_on timestamptz NOT NULL DEFAULT NOW(),
    updated_on timestamptz NULL DEFAULT NOW()
);

CREATE TABLE distributor_master (
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

CREATE TYPE docking_type AS ENUM (
    'SHIPPING_POINT',
    'UNLOADING_POINT'
);

CREATE TABLE orders (
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

CREATE TABLE warehouse_details (
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
CREATE TABLE otp (
    id SERIAL PRIMARY KEY,
    distributor_id INT NOT NULL,
    mobile_number VARCHAR(15) NOT NULL,
    otp_code INT NOT NULL,
    created_on timestamptz NOT NULL DEFAULT NOW(),
    expires_at timestamptz,
    refrence_code VARCHAR(200),
    FOREIGN KEY (distributor_id) REFERENCES distributor_master (id)
);

CREATE TABLE distributor_plants (
    id SERIAL PRIMARY KEY,
    distributor_id int NOT NULL,
    plant_id int NOT NULL,
    FOREIGN KEY (distributor_id) REFERENCES distributor_master (id),
    FOREIGN KEY (plant_id) REFERENCES plant_master (id)
);

COMMIT;

-- WITH RECURSIVE hierarchy AS (
--     SELECT
--         id,
--         name,
--         code,
--         parent_id
--     FROM
--         sales_hierarchy
--     WHERE
--         id = 5
--     UNION
--     SELECT
--         s.id,
--         s.name,
--         s.code,
--         s.parent_id
--     FROM
--         sales_hierarchy s
--         INNER JOIN hierarchy h ON h.parent_id = s.id
-- )
-- SELECT
--     *
-- FROM
--     hierarchy;


/* SCHEMA MODIFICATIONS */

ALTER TABLE distributor_plants drop constraint distributor_plants_distributor_id_fkey;

ALTER TABLE orders drop constraint orders_distributor_id_fkey;

ALTER TABLE otp drop constraint otp_distributor_id_fkey;

ALTER TABLE warehouse_details drop constraint warehouse_details_distributor_id_fkey;

ALTER TABLE distributor_master drop constraint distributor_master_profile_id_fkey;

alter table distributor_master alter column id type varchar(20), alter column profile_id type varchar(20);

alter table user_profile alter column id type varchar(20);

alter table distributor_plants alter column distributor_id type varchar(20);

alter table orders alter column distributor_id type varchar(20);

alter table otp alter column distributor_id type varchar(20);

alter table warehouse_details alter column distributor_id type varchar(20);

alter table distributor_master ADD constraint distributor_master_profile_id_fkey foreign key (profile_id) references user_profile(id);

alter table distributor_plants ADD constraint distributor_plants_distributor_id_fkey foreign key (distributor_id) references distributor_master(id);

alter table orders ADD constraint orders_distributor_id_fkey foreign key (distributor_id) references distributor_master(id);

alter table otp ADD constraint otp_distributor_id_fkey foreign key (distributor_id) references distributor_master(id);

alter table warehouse_details ADD constraint warehouse_details_distributor_id_fkey foreign key (distributor_id) references distributor_master(id);


/* INDEX FOR FULL TEXT SEARCH */

ALTER TABLE material_master ADD COLUMN textsearchable_index_col tsvector;

UPDATE material_master SET textsearchable_index_col = to_tsvector(description);

CREATE INDEX textsearch_idx ON material_master USING GIN (textsearchable_index_col);