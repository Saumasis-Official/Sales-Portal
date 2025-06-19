/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {

    pgm.sql(`
    
        UPDATE material_master SET textsearchable_index_col = to_tsvector(description);

    `);

};

exports.down = pgm => {

    pgm.sql(`
    
        UPDATE material_master SET textsearchable_index_col = null;
    
    `);

};
