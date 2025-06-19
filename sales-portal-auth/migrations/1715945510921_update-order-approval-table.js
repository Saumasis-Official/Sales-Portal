/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
    pgm.sql(`
    BEGIN;

    CREATE TABLE IF NOT EXISTS public.order_approval_requests_bkp 
    AS SELECT * FROM public.order_approval_requests;

    ALTER TABLE public.order_approval_requests DROP COLUMN IF EXISTS responded_on;
    ALTER TABLE public.order_approval_requests DROP COLUMN IF EXISTS responded_by;

    ALTER TABLE public.order_approval_requests ADD IF NOT EXISTS responded_on _timestamptz NULL;
    ALTER TABLE public.order_approval_requests ADD IF NOT EXISTS responded_by _varchar NULL;

    TRUNCATE TABLE public.order_approval_requests;

    INSERT INTO public.order_approval_requests
            (id,
            request_number,
            distributor_id,
            po_number,
            so_number,
            amount,
            status,
            type,
            requested_on,
            requested_by,
            responded_on,
            responded_by) 
    SELECT 
            id,
            request_number,
            distributor_id,
            po_number,
            so_number,
            amount,
            status,
            type,
            requested_on,
            requested_by,
            array[responded_on] as responded_on,
            array[responded_by] AS responded_by
    FROM order_approval_requests_bkp
    ON CONFLICT(request_number) DO NOTHING;

    DROP TABLE IF EXISTS public.order_approval_requests_bkp;

    COMMIT;
   `)
};

exports.down = pgm => {};