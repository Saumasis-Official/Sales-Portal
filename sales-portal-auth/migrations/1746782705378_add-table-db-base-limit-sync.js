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
        CREATE TABLE IF NOT EXISTS credit.distributor_base_limit_sync (
            id SERIAL PRIMARY KEY,
            party_code VARCHAR UNIQUE,
            party_name VARCHAR,
            base_limit VARCHAR,
            created_on timestamptz NOT NULL DEFAULT now(),
            updated_on timestamptz NULL,
            CONSTRAINT distributor_master__id_fkey FOREIGN KEY (party_code) REFERENCES public.distributor_master(id) ON DELETE CASCADE
        );
        `)
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.down = (pgm) => {
    pgm.sql(`
        DROP TABLE IF EXISTS credit.distributor_base_limit_sync;
    `)

};
