/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
    pgm.sql(`
        WITH modification AS (
            SELECT
                sl.id AS sms_id,
                el.email_data || sl.sms_data AS new_data
            FROM
                audit.sms_logs sl
            INNER JOIN email_logs el ON
                el.reference = sl.reference
        )
        UPDATE
            audit.sms_logs
        SET
            sms_data = new_data
        FROM
            modification
        WHERE
            id = sms_id;
        `);
};

exports.down = pgm => {};
