/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.sql(`
    UPDATE kams_customer_mapping 
SET customer_code = ARRAY(
  SELECT dm.profile_id AS customer_code
  FROM distributor_master dm
  LEFT JOIN user_profile up ON up.id = dm.profile_id
  WHERE dm.group_id IN (48, 51) AND up.name ILIKE '%rel%'
)
WHERE user_id IN ('TCPL_03990313','TCPL_06356224','TCPL_56732995','TCPL_99942230');
    `);
};

exports.down = (pgm) => {};
