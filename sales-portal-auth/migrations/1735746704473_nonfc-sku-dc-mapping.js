/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
    pgm.sql(`
            CREATE TABLE IF NOT EXISTS public.non_forecasted_sku_dist_channels_mapping (
                nonfc_sku_id int8 NOT NULL,
                distribution_channel int4 NOT NULL,
                CONSTRAINT non_forecasted_sku_dist_channels_mapping_pk PRIMARY KEY (nonfc_sku_id,distribution_channel),
                CONSTRAINT non_forecasted_sku_dist_channels_mapping_fk FOREIGN KEY (nonfc_sku_id) 
                    REFERENCES public.non_forecasted_sku(id) ON DELETE CASCADE ON UPDATE RESTRICT
                );
            
            INSERT INTO public.non_forecasted_sku_dist_channels_mapping(nonfc_sku_id, distribution_channel)
                SELECT id AS nonfc_sku_id, dcs.dist_channel AS distribution_channel
                FROM non_forecasted_sku src 
                CROSS JOIN (SELECT UNNEST(ARRAY[10,40]) AS dist_channel) AS dcs
            ON CONFLICT DO NOTHING;

        `);
};

exports.down = pgm => {
    pgm.sql(`
            DROP TABLE IF EXISTS public.non_forecasted_sku_dist_channels_mapping;
    `);
};
