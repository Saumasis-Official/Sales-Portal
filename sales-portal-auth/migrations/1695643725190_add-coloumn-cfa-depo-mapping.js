/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
   pgm.sql(`
   ALTER TABLE IF EXISTS public.cfa_depot_mapping add column IF NOT EXISTS group5_id integer; 
   ALTER table IF EXISTS cfa_depot_mapping add constraint zone_id_fk foreign key(group5_id) references group5_master(id);
   
   UPDATE cfa_depot_mapping cdm1
   SET group5_id = id_table.id
   from (
   select 
   distinct
   cdm.zone,
   gm.id
   from cfa_depot_mapping cdm 
   inner join group5_master gm 
   on gm.description ilike '%' || split_part(cdm."zone", '-',1) || ' ' || split_part(cdm."zone" , '-',2) || '%'
   order by cdm.zone
   ) as id_table
   WHERE cdm1."zone" = id_table.zone`)
};

exports.down = pgm => {
   pgm.sql(`ALTER TABLE IF EXISTS public.cfa_depot_mapping DROP IF EXISTS group5_id;`)
};
