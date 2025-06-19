/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
    pgm.sql(`

            CREATE TABLE IF NOT EXISTS stock_norm_configuration
            (
                id serial,
                g5_id integer NOT NULL,
                area_code character varying(6) NOT NULL,
                division integer NOT NULL,
                cycle_stock integer DEFAULT 4,
                safety_stock integer DEFAULT 2,
                updated_on timestamptz DEFAULT now(),
                updated_by character varying NOT NULL DEFAULT 'PORTAL_MANAGED',
                remarks character varying,
                is_deleted boolean DEFAULT false,
                CONSTRAINT stock_norm_configuration_pkey PRIMARY KEY (id),
                CONSTRAINT g5_area_ukey UNIQUE (g5_id, area_code, division),
                CONSTRAINT g5_fkey FOREIGN KEY (g5_id) REFERENCES group5_master (id) 
            );
            
            WITH div AS ( SELECT DISTINCT division
                        FROM material_sales_details
                        WHERE division IS NOT NULL),
                areas AS ( SELECT  group5_id, area_code
                            FROM distributor_master
                            WHERE group5_id IS NOT NULL AND area_code IS NOT NULL
                            GROUP BY group5_id, area_code
                            ORDER BY group5_id, area_code)
            INSERT INTO stock_norm_configuration (g5_id, area_code, division)
            SELECT a.group5_id, a.area_code, d.division
            FROM areas AS a
            INNER JOIN div AS d  ON true
            ON CONFLICT DO NOTHING;
        
    `)
};

exports.down = pgm => {
    pgm.sql(` DROP table IF EXISTS stock_norm_configuration`);
};