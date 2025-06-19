/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
    pgm.sql(`

        ALTER TABLE distributor_plants DROP CONSTRAINT distributor_plants_distributor_id_fkey;

        ALTER TABLE orders DROP CONSTRAINT orders_distributor_id_fkey;

        ALTER TABLE otp DROP CONSTRAINT otp_distributor_id_fkey;

        ALTER TABLE warehouse_details DROP CONSTRAINT warehouse_details_distributor_id_fkey;

        ALTER TABLE distributor_master DROP CONSTRAINT distributor_master_profile_id_fkey;

        ALTER TABLE distributor_master ALTER COLUMN id TYPE VARCHAR(20), ALTER COLUMN profile_id TYPE VARCHAR(20);

        ALTER TABLE user_profile ALTER COLUMN id TYPE VARCHAR(20);

        ALTER TABLE distributor_plants ALTER COLUMN distributor_id TYPE VARCHAR(20);

        ALTER TABLE orders ALTER COLUMN distributor_id TYPE VARCHAR(20);

        ALTER TABLE otp ALTER COLUMN distributor_id TYPE VARCHAR(20);

        ALTER TABLE warehouse_details ALTER COLUMN distributor_id TYPE VARCHAR(20);

        ALTER TABLE distributor_master ADD CONSTRAINT distributor_master_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES user_profile(id);

        ALTER TABLE distributor_plants ADD CONSTRAINT distributor_plants_distributor_id_fkey FOREIGN KEY (distributor_id) REFERENCES distributor_master(id);

        ALTER TABLE orders ADD CONSTRAINT orders_distributor_id_fkey FOREIGN KEY (distributor_id) REFERENCES distributor_master(id);

        ALTER TABLE otp ADD CONSTRAINT otp_distributor_id_fkey FOREIGN KEY (distributor_id) REFERENCES distributor_master(id);

        ALTER TABLE warehouse_details ADD CONSTRAINT warehouse_details_distributor_id_fkey FOREIGN KEY (distributor_id) REFERENCES distributor_master(id);

        /* INDEX FOR FULL TEXT SEARCH */
        ALTER TABLE material_master ADD COLUMN IF NOT EXISTS textsearchable_index_col tsvector;
        UPDATE material_master SET textsearchable_index_col = to_tsvector(description);
        CREATE INDEX IF NOT EXISTS textsearch_idx ON material_master USING GIN (textsearchable_index_col);

        ALTER TABLE IF EXISTS distributor_master ALTER COLUMN pdp_day type character varying(500);
        ALTER TABLE IF EXISTS warehouse_details ADD CONSTRAINT warehouse_details_ukey UNIQUE (distributor_id, sales_org, distrbution_channel, division, type, partner_name, partner_code);
        
    `);
};

exports.down = pgm => {
    pgm.sql(`
        
        ALTER TABLE distributor_plants DROP CONSTRAINT distributor_plants_distributor_id_fkey;

        ALTER TABLE orders DROP CONSTRAINT orders_distributor_id_fkey;

        ALTER TABLE otp DROP CONSTRAINT otp_distributor_id_fkey;

        ALTER TABLE warehouse_details DROP CONSTRAINT warehouse_details_distributor_id_fkey;

        ALTER TABLE distributor_master DROP CONSTRAINT distributor_master_profile_id_fkey;

        ALTER TABLE distributor_master ALTER COLUMN id TYPE INT, ALTER COLUMN profile_id TYPE INT;

        ALTER TABLE user_profile ALTER COLUMN id TYPE INT;

        ALTER TABLE distributor_plants ALTER COLUMN distributor_id TYPE INT;

        ALTER TABLE orders ALTER COLUMN distributor_id TYPE INT;

        ALTER TABLE otp ALTER COLUMN distributor_id TYPE INT;

        ALTER TABLE warehouse_details ALTER COLUMN distributor_id TYPE INT;

        ALTER TABLE distributor_master ADD CONSTRAINT distributor_master_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES user_profile(id);

        ALTER TABLE distributor_plants ADD CONSTRAINT distributor_plants_distributor_id_fkey FOREIGN KEY (distributor_id) REFERENCES distributor_master(id);

        ALTER TABLE orders ADD CONSTRAINT orders_distributor_id_fkey FOREIGN KEY (distributor_id) REFERENCES distributor_master(id);

        ALTER TABLE otp ADD CONSTRAINT otp_distributor_id_fkey FOREIGN KEY (distributor_id) REFERENCES distributor_master(id);

        ALTER TABLE warehouse_details ADD CONSTRAINT warehouse_details_distributor_id_fkey FOREIGN KEY (distributor_id) REFERENCES distributor_master(id);

        /* INDEX FOR FULL TEXT SEARCH */
        ALTER TABLE material_master DROP COLUMN textsearchable_index_col;
        DROP INDEX textsearch_idx;
        
    `);
};
