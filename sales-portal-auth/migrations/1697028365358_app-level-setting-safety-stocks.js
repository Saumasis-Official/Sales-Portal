/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
    pgm.sql(`
    insert into app_level_settings (key,value,updated_by,field_type,description)
    values ('STOCK_NORM','25','PORTAL_MANAGED','TEXT','To Set Stock Norm enter number between 0 to 100')
    ON  CONFLICT DO NOTHING;
 
    insert into app_level_settings (key,value,updated_by,field_type,description)
    values ('SAFETY_STOCK','0','PORTAL_MANAGED','TEXT','To Set Safety Stock  enter number between 0 to 100')
    ON  CONFLICT DO NOTHING;
   `)
};

exports.down = pgm => {
    pgm.sql(`
    delete  
from
	app_level_settings
where
	key in('STOCK_NORM', 'SAFETY_STOCK')
    `)
};
