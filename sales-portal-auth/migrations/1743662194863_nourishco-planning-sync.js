/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = (pgm) => {
    pgm.sql(`
        BEGIN;
            ALTER TYPE sync_type ADD VALUE IF NOT EXISTS 'NOURISHCO_PLANNING_SYNC';
        COMMIT;
        `);
    pgm.sql(`

        INSERT
        INTO
        public.sync_logs
        (
            "type",
            run_at,
            "result",
            user_id
        )
        VALUES(
            'NOURISHCO_PLANNING_SYNC',
            now(),
            'SUCCESS',
            'PORTAL_MANAGED'
        );
    `);
};

exports.down = (pgm) => {};
