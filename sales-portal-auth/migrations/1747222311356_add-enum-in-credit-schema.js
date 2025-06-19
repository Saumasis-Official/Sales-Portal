/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
exports.shorthands = undefined;

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.up = (pgm) => {
    pgm.sql(`
        DO $$
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_type t
                           JOIN pg_enum e ON t.oid = e.enumtypid
                           WHERE t.typname = 'credit.audit_trail_type' AND e.enumlabel = 'GT_END_CRON') THEN
                ALTER TYPE credit.audit_trail_type ADD VALUE 'GT_END_CRON';
            END IF;
        END $$;
        
        DO $$
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_type t
                           JOIN pg_enum e ON t.oid = e.enumtypid
                           WHERE t.typname = 'credit.transaction_status' AND e.enumlabel = 'GT_COMPLETED') THEN
                ALTER TYPE credit.transaction_status ADD VALUE 'GT_COMPLETED';
            END IF;
        END $$;
`)
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.down = (pgm) => {};
