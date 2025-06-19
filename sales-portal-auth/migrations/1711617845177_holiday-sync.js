/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
    pgm.sql(`
    BEGIN;
    ALTER TYPE sync_type ADD VALUE IF NOT EXISTS 'SAP_HOLIDAY_SYNC';
    ALTER TABLE IF EXISTS public.sap_holidays add constraint sap_holidays_ukey 
    UNIQUE (year,state_code,state_description,holiday_date);
    COMMIT;
    END TRANSACTION;
    INSERT INTO public.sync_logs ("type",run_at,"result") VALUES
	 ('SAP_HOLIDAY_SYNC','2022-04-09 00:00:29.715961+05:30','SUCCESS');
    `);
};

exports.down = pgm => { };
