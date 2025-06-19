/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
    pgm.sql(`
    BEGIN;
    ALTER TYPE public.app_config_field_type ADD VALUE if not exists 'TIME';

    COMMIT;
    END TRANSACTION;
    INSERT INTO app_level_settings (key, value, updated_by,  field_type, description) values 
    ('ENABLE_PROMISE_CREDIT_SECOND_START_TIME', '19:30', 'PORTAL_MANAGED', 'TIME', 'Time at which 2nd promised credit consent will start'),
   ('ENABLE_PROMISE_CREDIT_SECOND_END_TIME', '20:30', 'PORTAL_MANAGED', 'TIME', 'Time at which 2nd promised credit consent will end');   
   
`);

};

exports.down = pgm => {
    pgm.sql(`
    DELETE FROM app_level_settings where key IN ('ENABLE_PROMISE_CREDIT_SECOND_START_TIME','ENABLE_PROMISE_CREDIT_SECOND_END_TIME');
`);
};
