/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
    pgm.sql(`
        
        ALTER TABLE IF EXISTS customer_group_master ADD COLUMN IF NOT EXISTS pdp_unlock_enabled bool DEFAULT true;

        WITH cgs AS (SELECT  array_agg(cgm.name) AS names,
            string_agg(cgm.name,',') AS value
            FROM  customer_group_master cgm )
        INSERT INTO app_level_settings(key, value, updated_by, field_type,allowed_values, description)
            SELECT 'PDP_UNLOCK_WINDOW_CGS' AS "key" 
                ,cgs.value 
                ,'PORTAL_MANAGED' AS updated_by
                ,'SET' AS field_type
                ,cgs.names
                ,'To enable/disable customer groups for which auto pdp_unlock window will be applicable' AS description
            FROM cgs
        ON  CONFLICT DO NOTHING;
    `);
};

exports.down = pgm => {
    pgm.sql(`
        ALTER TABLE IF EXISTS customer_group_master DROP COLUMN IF EXISTS pdp_unlock_enabled;
    `);
};
