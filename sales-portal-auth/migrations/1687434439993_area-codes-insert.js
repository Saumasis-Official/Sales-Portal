/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
    pgm.sql( `
                INSERT INTO area_codes (code)
                    SELECT DISTINCT AREA_CODE AS CODE
                    FROM DISTRIBUTOR_MASTER
                    WHERE AREA_CODE IS NOT NULL
                ON CONFLICT (code) do nothing;
            `);
};

exports.down = pgm => {};
