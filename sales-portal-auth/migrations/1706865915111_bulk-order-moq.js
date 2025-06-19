/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = (pgm) => {
    pgm.sql(`
              CREATE TABLE IF NOT EXISTS bulk_order_moq_db_mapping  (
                  key bigserial NOT NULL PRIMARY KEY,
                  db_id character varying(20) NOT NULL,
                  plant_id integer NOT NULL,
                  current_moq numeric DEFAULT 0.0,
                  CONSTRAINT db_id_fkey
                  FOREIGN KEY(db_id) 
                  REFERENCES distributor_master(id)
                  ON UPDATE RESTRICT
                  ON DELETE CASCADE,
                  CONSTRAINT plant_id_fkey
                  FOREIGN KEY(plant_id) 
                  REFERENCES plant_master(id)
                  ON UPDATE RESTRICT
                  ON DELETE CASCADE,
                  CONSTRAINT bo_db_plant_ukey 
                  UNIQUE (db_id, plant_id));
  
              CREATE TABLE IF NOT EXISTS bulk_order_audit_trail  (
                  key bigserial NOT NULL PRIMARY KEY,
                  bulk_moq_key bigint NOT NULL,
                  current_moq numeric DEFAULT 0.0,
                  modified_on timestamptz DEFAULT now(),
                  modified_by character varying NOT NULL,
                  CONSTRAINT bulk_moq_fkey
                  FOREIGN KEY(bulk_moq_key) 
                  REFERENCES bulk_order_moq_db_mapping(key)
                  ON UPDATE RESTRICT
                  ON DELETE CASCADE);
  
              INSERT INTO bulk_order_moq_db_mapping (db_id, plant_id)
                  SELECT DISTINCT 
                         distributor_id AS db_id
                         ,plant_id AS plant_id
                  FROM distributor_plants
                  GROUP BY distributor_id, plant_id 
                  ORDER BY distributor_id, plant_id
              ON CONFLICT (db_id, plant_id) DO NOTHING;
          `);
  };
  
  exports.down = (pgm) => {
    pgm.sql(`
              DROP TABLE IF EXISTS moq_audit_trail;
              DROP TABLE IF EXISTS moq_db_mapping;
          `);
  };