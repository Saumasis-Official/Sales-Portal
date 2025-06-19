/* eslint-disable camelcase */
/* eslint-disable no-undef */

exports.shorthands = undefined;

exports.up = (pgm) => {
    pgm.sql(`
        CREATE TABLE IF NOT EXISTS infra.previous_process_calender (
            id SERIAL, 
            date INT4 NOT NULL,
            expected_startTime VARCHAR NULL,
            last_updated_by VARCHAR(255) NULL DEFAULT 'PORTAL_MANAGED'::character varying,
            updated_on TIMESTAMP default now(),
            full_date DATE UNIQUE NULL
        );
    `);

    pgm.sql(`
        INSERT INTO infra.previous_process_calender (date, expected_startTime)
        VALUES (1, '08:00,20:00');
    `);

    for (let i = 2; i <= 24; i++) {
        pgm.sql(`
            INSERT INTO infra.previous_process_calender (date, expected_startTime)
            VALUES (${i}, '20:00');
        `);
    }

    for (let i = 25; i <= 31; i++) {
        pgm.sql(`
            INSERT INTO infra.previous_process_calender (date, expected_startTime)
            VALUES (${i}, '12:00,16:00,20:00');
        `);
    }

    pgm.sql(`
         UPDATE infra.previous_process_calender SET full_date = TO_DATE('2025' || '-' || '03' || '-' || LPAD(date::TEXT, 2, '0'), 'YYYY-MM-DD');
`);

    pgm.sql(`
        ALTER TABLE infra.process_calender 
        ADD COLUMN IF NOT EXISTS updated_on TIMESTAMP NULL DEFAULT NULL,
        ADD COLUMN IF NOT EXISTS full_date DATE NULL;
    `);

    pgm.sql(`
      UPDATE infra.process_calender
                SET full_date = CASE
                WHEN date <= EXTRACT(DAY FROM DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month' - INTERVAL '1 day') 
                THEN TO_DATE(TO_CHAR(CURRENT_DATE, 'YYYY-MM') || '-' || LPAD(date::TEXT, 2, '0'), 'YYYY-MM-DD'
                 )
                 ELSE NULL
                 END
                 WHERE date BETWEEN 1 AND 31

        `);
};

exports.down = (pgm) => {
    pgm.sql(`
        DROP TABLE IF EXISTS infra.previous_process_calender;
        ALTER TABLE infra.process_calender DROP COLUMN IF EXISTS updated_on;
        ALTER TABLE infra.process_calender DROP COLUMN IF EXISTS full_date;
    `);
};
