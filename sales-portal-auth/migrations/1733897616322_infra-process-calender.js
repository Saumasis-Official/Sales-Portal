/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
    pgm.sql(`
        create table if not exists infra.process_calender (
        id serial, 
        date int4 not null,
        expected_startTime varchar null)
    `);
    
    pgm.sql(`
        INSERT INTO infra.process_calender (date, expected_startTime)
        VALUES (1, '08:00,20:00');
    `);

    for (let i = 2; i <= 24; i++) {
        pgm.sql(`
            INSERT INTO infra.process_calender (date, expected_startTime)
            VALUES (${i}, '20:00');
        `);
    }

    for (let i = 25; i <= 31; i++) {
        pgm.sql(`
            INSERT INTO infra.process_calender (date, expected_startTime)
            VALUES (${i}, '12:00,16:00,20:00');
        `);
    }
};

exports.down = pgm => {
    pgm.sql(`
      
      DROP TABLE IF EXISTS infra.process_calender;
      `)
};
