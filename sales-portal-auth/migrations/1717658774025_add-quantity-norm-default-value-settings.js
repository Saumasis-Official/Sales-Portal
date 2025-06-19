/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
    pgm.sql(`INSERT INTO public.app_level_settings ("key",value,updated_by,remarks,allowed_values,field_type,description,created_on,updated_on) VALUES
        ('QUANTITY_NORM_DEFAULT_VALUE', '2', 'PORTAL_MANAGED', NULL, NULL, 'TEXT', 'To set the default quantity( in CV) to be applied when forecast is 0 at DBxPSKU level', 'NOW()', 'NOW()') ON conflict(key) DO NOTHING;
 `)
};

exports.down = pgm => {};
