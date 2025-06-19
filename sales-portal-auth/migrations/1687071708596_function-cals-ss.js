/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
    pgm.sql(`
            create or replace function calc_ss(p_db text) 
            returns jsonb
            as $$
                declare  
                ss int;
                psku_arr text[] := array[]::text[];
                month_str_arr text[] := array[]::text[];
                pos int;
                ss_arr numeric[] := array[]::numeric[];
                month_str text := '';
                begin 
                    SELECT max(ms.safety_stock)::int
                    INTO  ss
                    FROM material_stock AS ms 
                    WHERE ms.sold_to_party = p_db;
                    
                    if ss is  null then return jsonb_build_object('psku',psku_arr,'ss',ss_arr);
                    end if;
                    
                    SELECT array_agg(ds.cn) 
                    INTO month_str_arr
                    FROM (SELECT '_'||((to_char((generate_series(current_date+1, current_date + ss, '1 day'))::date, 'DD'))::int)::text AS cn) AS ds; 
                    
                    pos = array_position(month_str_arr, '_1');
                    
                    if pos is  null then pos =array_upper(month_str_arr, 1)+1;
                    end if;
                    
                    for counter in 1 .. pos-1 loop 
                        month_str_arr[counter] = 'COALESCE(' ||  'fd.' || month_str_arr[counter] || ',0)';
                    end loop;

                    for counter in pos .. array_upper(month_str_arr, 1) loop 
                        month_str_arr[counter] =  'COALESCE(' ||  'f_d.' || month_str_arr[counter] || ',0)';
                    end loop;
                    
                    month_str = array_to_string(month_str_arr[0:], ' + ');
                    
                    EXECUTE format('SELECT array_agg(fd.psku), array_agg((%s)/mc.base_to_case) 
                                    FROM forecast_distribution AS fd 
                                    LEFT JOIN forecast_distribution AS f_d
                                    ON (fd.distributor_code = f_d.distributor_code AND fd.psku=  f_d.psku)
                                    INNER JOIN material_conversion AS mc
                                    ON (fd.psku=  mc.parent_sku)
                                    WHERE fd.applicable_month = CONCAT(to_char(current_date, ''YYYY''),to_char(current_date, ''MM'')) AND 
                                        f_d.applicable_month = CONCAT(to_char(current_date + interval ''1 month'', ''YYYY''),to_char(current_date + interval ''1 month'', ''MM'')) AND 
                                        fd.distributor_code = ''%s'' AND 
                                        f_d.distributor_code = ''%s''',month_str,p_db,p_db)
                    INTO psku_arr,ss_arr;		
                    
                    return jsonb_build_object('psku',psku_arr,'ss',ss_arr);
                end;
            $$ 
            language plpgsql;
    `);
};

exports.down = pgm => {
    pgm.sql(`drop function if exists calc_ss;`);
};
