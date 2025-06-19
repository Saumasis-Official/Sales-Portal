/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {

    pgm.sql(`
        INSERT INTO public.pdp_lock_audit_trail(status, updated_by, updated_on, request_id, "comments") VALUES
        (false, 'SYSTEM_GENERATED', '2024-08-25 11:28:56.303 +0530', 'APP_SETTINGS_UNLOCK', 'Manual entry as requested by Manas Aggarwal'),
        (true, 'SYSTEM_GENERATED', '2024-09-01 11:28:56.303 +0530', 'APP_SETTINGS_LOCK', 'PDP enabled - September 1');
`);
};

exports.down = pgm => {
    pgm.sql(``);
};