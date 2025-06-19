/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
    pgm.sql(`
        BEGIN;
            ALTER TABLE group5_master ADD IF NOT EXISTS rsm_code varchar(6);
            ALTER TABLE group5_master ADD IF NOT EXISTS cluster_code varchar(6);

            INSERT INTO group5_master(id, "name", description, status, created_on, updated_on, rsm_code, cluster_code)
                SELECT gm.id
                    ,gm.name 
                    ,gm.description
                    ,gm.status
                    ,gm.created_on
                    ,gm.updated_on
                    ,'RM' || gm.name as rsm_code
                    ,'CM' || SUBSTRING(gm.name FROM 1 FOR 1) || 'R' as cluster_code
                FROM group5_master gm
            ON CONFLICT (id) DO UPDATE 
                SET rsm_code = EXCLUDED.rsm_code , cluster_code = EXCLUDED.cluster_code;
        COMMIT;
   `);
};

exports.down = pgm => {
    pgm.sql(`
        ALTER TABLE group5_master DROP COLUMN IF EXISTS rsm_code;
        ALTER TABLE group5_master DROP COLUMN IF EXISTS cluster_code;
   `);
};