/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
	pgm.sql(`
		CREATE TYPE ars_configuration_type AS ENUM (
			'GENERAL',
			'SWITCH',
			'TIMELINE'
		);

		CREATE TABLE IF NOT EXISTS public.ars_configurations (
			id bigserial NOT NULL,
			CONFIGURATION public.ars_configuration_type NOT NULL,
			region_id int8 NULL,
			customer_group_id int8 NULL,
			auto_order bool NULL,
			auto_order_submit bool NULL,
			enable_adjustment bool NULL,
			start_date int4 NULL,
			end_date int4 NULL,
			"key" TEXT NULL,
			"values" TEXT NULL,
			allowed_values _text NULL,
			deleted bool DEFAULT FALSE NOT NULL,
			updated_on timestamptz DEFAULT now() NOT NULL,
			updated_by varchar DEFAULT 'PORTAL_MANAGED'::CHARACTER VARYING NOT NULL,
			remarks TEXT NULL,
			field_type public.app_config_field_type DEFAULT 'TEXT'::app_config_field_type NOT NULL,
			description TEXT NULL,
			CONSTRAINT ars_configurations_pk PRIMARY KEY (id),
			CONSTRAINT ars_configurations_unique UNIQUE (CONFIGURATION,region_id,customer_group_id,KEY),
			CONSTRAINT ars_configurations_customer_group_master_fk FOREIGN KEY (customer_group_id) REFERENCES public.customer_group_master(id),
			CONSTRAINT ars_configurations_group5_master_fk FOREIGN KEY (region_id) REFERENCES public.group5_master(id)
		);

		CREATE UNIQUE INDEX ars_configurations_unique_null_idx ON
		public.ars_configurations
			USING btree (CONFIGURATION,COALESCE(region_id,('-1'::integer)::bigint),COALESCE(customer_group_id,('-1'::integer)::bigint),COALESCE(KEY,''::TEXT));

		INSERT
			INTO
			ars_configurations (
				"key",
				"values",
				updated_by,
				remarks,
				allowed_values,
				field_type,
				description,
				updated_on,
				CONFIGURATION
			)
		SELECT
			"key",
			value,
			updated_by,
			remarks,
			allowed_values,
			field_type,
			description,
			updated_on,
			'GENERAL'
		FROM
			public.app_level_settings
		WHERE
			"key" in ('QUANTITY_NORM_DEFAULT_VALUE', 'SAFETY_STOCK', 'STOCK_NORM')
		ON CONFLICT (CONFIGURATION,COALESCE (region_id,-1),COALESCE (customer_group_id,-1),COALESCE("key",''))
				DO
		UPDATE
		SET
				VALUES = excluded.VALUES,
				updated_by = excluded.updated_by,
				updated_on = excluded.updated_on,
				field_type = excluded.field_type,
				remarks = excluded.remarks,
				allowed_values = excluded.allowed_values,
				description = excluded.description
				;

		INSERT
					INTO
					ars_configurations (
						CONFIGURATION ,
						customer_group_id ,
						enable_adjustment ,
						updated_by,
						remarks,
						field_type,
						updated_on
			)
				SELECT
					'TIMELINE',
					(
						SELECT
							ID
						FROM
							customer_group_master cgm
						WHERE
							cgm.name = (
								CASE
									WHEN als.KEY ILIKE '%PRAGATI%' THEN '48'
							WHEN als.KEY ILIKE '%NON_METRO%' THEN '10'
							WHEN als.KEY ILIKE '%METRO%' THEN '31'
							ELSE '0'
							END
						)
			) AS CG,
					(
				CASE
						WHEN als.value = 'TRUE' THEN TRUE
					ELSE FALSE
				END
			) AS VALUE,
					updated_by,
					remarks,
					field_type,
					updated_on
		FROM
					public.app_level_settings als
		WHERE
					"key" ILIKE 'AO_%_ADJUSTMENT_ENABLE'
				ON
			CONFLICT (CONFIGURATION,COALESCE (region_id,-1),COALESCE (customer_group_id,-1),COALESCE("key",''))
				DO
		UPDATE
		SET
				enable_adjustment = excluded.enable_adjustment,
				updated_by = excluded.updated_by,
				updated_on = excluded.updated_on,
				field_type = excluded.field_type,
				remarks = excluded.remarks
				;

		INSERT
			INTO
			ars_configurations (
				CONFIGURATION ,
				customer_group_id ,
				end_date ,
				updated_by,
				remarks,
				field_type,
				allowed_values ,
				updated_on
			)
		SELECT
			'TIMELINE',
			(
				SELECT
					ID
				FROM
					customer_group_master cgm
				WHERE
					cgm.name = (
						CASE
							WHEN als.KEY ILIKE '%PRAGATI%' THEN '48'
							WHEN als.KEY ILIKE '%NON_METRO%' THEN '10'
							WHEN als.KEY ILIKE '%METRO%' THEN '31'
							ELSE '0'
						END
					)
			) AS CG,
			VALUE::int,
			updated_by,
			remarks,
			field_type,
			allowed_values ,
			updated_on
		FROM
			public.app_level_settings als
		WHERE
			"key" ILIKE 'AO_%_ADJUSTMENT_END_DATE'
		ON
			CONFLICT (CONFIGURATION,COALESCE (region_id,-1),COALESCE (customer_group_id,-1),COALESCE("key",''))
		DO
		UPDATE
		SET
			end_date = excluded.end_date,
			updated_by = excluded.updated_by,
			updated_on = excluded.updated_on,
			field_type = excluded.field_type,
			remarks = excluded.remarks,
			allowed_values = excluded.allowed_values
		;

		INSERT
			INTO
			ars_configurations (
				CONFIGURATION ,
				customer_group_id ,
				start_date ,
				updated_by,
				remarks,
				field_type,
				allowed_values ,
				updated_on
			)
		SELECT
			'TIMELINE',
			(
				SELECT
					ID
				FROM
					customer_group_master cgm
				WHERE
					cgm.name = (
						CASE
							WHEN als.KEY ILIKE '%PRAGATI%' THEN '48'
							WHEN als.KEY ILIKE '%NON_METRO%' THEN '10'
							WHEN als.KEY ILIKE '%METRO%' THEN '31'
							ELSE '0'
						END
					)
			) AS CG,
			VALUE::int,
			updated_by,
			remarks,
			field_type,
			allowed_values ,
			updated_on
		FROM
			public.app_level_settings als
		WHERE
			"key" ILIKE 'AO_%_ADJUSTMENT_START_DATE'
		ON
			CONFLICT (CONFIGURATION,COALESCE (region_id,-1),COALESCE (customer_group_id,-1),COALESCE("key",''))
		DO
		UPDATE
		SET
			start_date = excluded.start_date,
			updated_by = excluded.updated_by,
			updated_on = excluded.updated_on,
			field_type = excluded.field_type,
			remarks = excluded.remarks,
			allowed_values = excluded.allowed_values
		;

		INSERT
			INTO
			ars_configurations (
				CONFIGURATION ,
				region_id ,
				customer_group_id ,
				auto_order ,
				updated_by,
				remarks,
				field_type,
				updated_on
			)
		SELECT
			'SWITCH',
			(
				SELECT
					id
				FROM
					group5_master
				WHERE
					name = (string_to_array(als."key",'_'))[array_length(string_to_array(als."key",'_'),1)]
			) AS gm_id,
			(
				SELECT
					ID
				FROM
					customer_group_master cgm
				WHERE
					cgm.name = (
						CASE
							WHEN als.KEY ILIKE '%PRAGATI%' THEN '48'
							WHEN als.KEY ILIKE '%NON_METRO%' THEN '10'
							WHEN als.KEY ILIKE '%METRO%' THEN '31'
							ELSE '0'
						END
					)
			) AS CG,
			(
				CASE
					WHEN als.value = 'TRUE' THEN TRUE
					ELSE FALSE
				END
			) AS VALUE,
			updated_by,
			remarks,
			field_type,
			updated_on
		FROM
			public.app_level_settings als
		WHERE
			"key" ILIKE 'AO_%_ENABLE_%'
		ON
			CONFLICT (CONFIGURATION,COALESCE (region_id,-1),COALESCE (customer_group_id,-1),COALESCE("key",''))
		DO
		UPDATE
		SET
			auto_order = excluded.auto_order,
			updated_by = excluded.updated_by,
			updated_on = excluded.updated_on,
			field_type = excluded.field_type,
			remarks = excluded.remarks
		;

		INSERT
			INTO
			ars_configurations (
				CONFIGURATION ,
				region_id ,
				customer_group_id ,
				auto_order_submit ,
				updated_by,
				remarks,
				field_type,
				updated_on
			)
		SELECT
			'SWITCH',
			(
				SELECT
					id
				FROM
					group5_master
				WHERE
					name = (string_to_array(als."key",'_'))[array_length(string_to_array(als."key",'_'),1)]
			) AS gm_id,
			(
				SELECT
					ID
				FROM
					customer_group_master cgm
				WHERE
					cgm.name = (
						CASE
							WHEN als.KEY ILIKE '%PRAGATI%' THEN '48'
							WHEN als.KEY ILIKE '%NON_METRO%' THEN '10'
							WHEN als.KEY ILIKE '%METRO%' THEN '31'
							ELSE '0'
						END
					)
			) AS CG,
			(
				CASE
					WHEN als.value = 'TRUE' THEN TRUE
					ELSE FALSE
				END
			) AS VALUE,
			updated_by,
			remarks,
			field_type,
			updated_on
		FROM
			public.app_level_settings als
		WHERE
			"key" ILIKE 'AO_%_ORDER_SUBMIT_%'
		ON
			CONFLICT (CONFIGURATION,COALESCE (region_id,-1),COALESCE (customer_group_id,-1),COALESCE("key",''))
		DO
		UPDATE
		SET
			auto_order_submit = excluded.auto_order_submit,
			updated_by = excluded.updated_by,
			updated_on = excluded.updated_on,
			field_type = excluded.field_type,
			remarks = excluded.remarks
		;

		INSERT
			INTO
			ars_configurations (
				CONFIGURATION ,
				region_id ,
				customer_group_id ,
				auto_order ,
				auto_order_submit ,
				updated_by,
				field_type,
				updated_on
			)
		SELECT
			'SWITCH',
			(
				SELECT
					id
				FROM
					group5_master
				WHERE
					name = (string_to_array(als."key",'_'))[array_length(string_to_array(als."key",'_'),1)]
			) AS gm_id,
			(
				SELECT
					ID
				FROM
					customer_group_master cgm
				WHERE
					cgm.name = '11'
			) AS CG,
			TRUE AS auto_order ,
			TRUE AS auto_order_submit,
			'PORTAL_MANAGED' updated_by,
			field_type,
			NOW()
		FROM
			public.app_level_settings als
		WHERE
			"key" ILIKE 'AO_METRO_ORDER_SUBMIT_%'
		ON
			CONFLICT (CONFIGURATION,COALESCE (region_id,-1),COALESCE (customer_group_id,-1),COALESCE("key",''))
		DO
		UPDATE
		SET
			auto_order_submit = excluded.auto_order_submit,
			auto_order = excluded.auto_order,
			updated_by = excluded.updated_by,
			updated_on = excluded.updated_on,
			field_type = excluded.field_type,
			remarks = excluded.remarks
		;

		INSERT
			INTO
			ars_configurations (
				CONFIGURATION ,
				customer_group_id ,
				enable_adjustment ,
				start_date ,
				end_date ,
				updated_by,
				remarks,
				field_type,
				allowed_values ,
				updated_on
			)
		SELECT
			'TIMELINE',
			(
				SELECT
					ID
				FROM
					customer_group_master cgm
				WHERE
					cgm.name = '11'
			) AS CG,
			TRUE AS enable_adjustment ,
			20 ,
			31,
			'PORTAL_MANAGED' AS updated_by,
			remarks,
			field_type,
			allowed_values ,
			now() AS updated_on
		FROM
			public.app_level_settings als
		WHERE
			"key" ILIKE 'AO_METRO_ADJUSTMENT_END_DATE'
		ON
			CONFLICT (CONFIGURATION,COALESCE (region_id,-1),COALESCE (customer_group_id,-1),COALESCE("key",''))
		DO
		UPDATE
		SET
			enable_adjustment = excluded.enable_adjustment,
			start_date = excluded.start_date,
			end_date = excluded.end_date,
			updated_by = excluded.updated_by,
			updated_on = excluded.updated_on,
			field_type = excluded.field_type,
			remarks = excluded.remarks,
			allowed_values = excluded.allowed_values
		;

		INSERT INTO ars_configurations ("configuration", region_id, customer_group_id, auto_order, auto_order_submit, field_type)
		SELECT
			'SWITCH',
			gm.id,
			(SELECT id FROM customer_group_master cgm WHERE cgm.name = '11'),
			TRUE ,
			TRUE ,
			'SET'
		FROM
			group5_master gm
		WHERE
			gm."name" NOT IN (
				'NR', 'SR', 'ER', 'WR'
			)
		ON
		CONFLICT (CONFIGURATION,COALESCE (region_id,-1),COALESCE (customer_group_id,-1),COALESCE("key",''))
		DO
		UPDATE
		SET
			auto_order  = excluded.auto_order,
			auto_order_submit  = excluded.auto_order_submit,
			field_type = excluded.field_type
		;

		DELETE FROM stock_norm_default WHERE id != all(SELECT min(id)FROM stock_norm_default GROUP BY customer_group_id);
		ALTER TABLE public.stock_norm_default ADD CONSTRAINT stock_norm_default_unique UNIQUE (customer_group_id);

		delete from app_level_settings
		where key in (
		'AO_METRO_ADJUSTMENT_ENABLE',
		'AO_METRO_ADJUSTMENT_END_DATE',
		'AO_METRO_ADJUSTMENT_START_DATE',
		'AO_METRO_ENABLE_C1',
		'AO_METRO_ENABLE_C2',
		'AO_METRO_ENABLE_E1',
		'AO_METRO_ENABLE_E2',
		'AO_METRO_ENABLE_N1',
		'AO_METRO_ENABLE_N2',
		'AO_METRO_ENABLE_S1',
		'AO_METRO_ENABLE_S2',
		'AO_METRO_ENABLE_S3',
		'AO_METRO_ENABLE_W1',
		'AO_METRO_ENABLE_W2',
		'AO_METRO_ORDER_SUBMIT_C1',
		'AO_METRO_ORDER_SUBMIT_C2',
		'AO_METRO_ORDER_SUBMIT_E1',
		'AO_METRO_ORDER_SUBMIT_E2',
		'AO_METRO_ORDER_SUBMIT_N1',
		'AO_METRO_ORDER_SUBMIT_N2',
		'AO_METRO_ORDER_SUBMIT_S1',
		'AO_METRO_ORDER_SUBMIT_S2',
		'AO_METRO_ORDER_SUBMIT_S3',
		'AO_METRO_ORDER_SUBMIT_W1',
		'AO_METRO_ORDER_SUBMIT_W2',
		'AO_NON_METRO_ADJUSTMENT_ENABLE',
		'AO_NON_METRO_ADJUSTMENT_END_DATE',
		'AO_NON_METRO_ADJUSTMENT_START_DATE',
		'AO_NON_METRO_ENABLE_C1',
		'AO_NON_METRO_ENABLE_C2',
		'AO_NON_METRO_ENABLE_E1',
		'AO_NON_METRO_ENABLE_E2',
		'AO_NON_METRO_ENABLE_N1',
		'AO_NON_METRO_ENABLE_N2',
		'AO_NON_METRO_ENABLE_S1',
		'AO_NON_METRO_ENABLE_S2',
		'AO_NON_METRO_ENABLE_S3',
		'AO_NON_METRO_ENABLE_W1',
		'AO_NON_METRO_ENABLE_W2',
		'AO_NON_METRO_ORDER_SUBMIT_C1',
		'AO_NON_METRO_ORDER_SUBMIT_C2',
		'AO_NON_METRO_ORDER_SUBMIT_E1',
		'AO_NON_METRO_ORDER_SUBMIT_E2',
		'AO_NON_METRO_ORDER_SUBMIT_N1',
		'AO_NON_METRO_ORDER_SUBMIT_N2',
		'AO_NON_METRO_ORDER_SUBMIT_S1',
		'AO_NON_METRO_ORDER_SUBMIT_S2',
		'AO_NON_METRO_ORDER_SUBMIT_S3',
		'AO_NON_METRO_ORDER_SUBMIT_W1',
		'AO_NON_METRO_ORDER_SUBMIT_W2',
		'AO_PRAGATI_ADJUSTMENT_ENABLE',
		'AO_PRAGATI_ADJUSTMENT_END_DATE',
		'AO_PRAGATI_ADJUSTMENT_START_DATE',
		'AO_PRAGATI_ENABLE_C1',
		'AO_PRAGATI_ENABLE_C2',
		'AO_PRAGATI_ENABLE_E1',
		'AO_PRAGATI_ENABLE_E2',
		'AO_PRAGATI_ENABLE_N1',
		'AO_PRAGATI_ENABLE_N2',
		'AO_PRAGATI_ENABLE_S1',
		'AO_PRAGATI_ENABLE_S2',
		'AO_PRAGATI_ENABLE_S3',
		'AO_PRAGATI_ENABLE_W1',
		'AO_PRAGATI_ENABLE_W2',
		'AO_PRAGATI_ORDER_SUBMIT_C1',
		'AO_PRAGATI_ORDER_SUBMIT_C2',
		'AO_PRAGATI_ORDER_SUBMIT_E1',
		'AO_PRAGATI_ORDER_SUBMIT_E2',
		'AO_PRAGATI_ORDER_SUBMIT_N1',
		'AO_PRAGATI_ORDER_SUBMIT_N2',
		'AO_PRAGATI_ORDER_SUBMIT_S1',
		'AO_PRAGATI_ORDER_SUBMIT_S2',
		'AO_PRAGATI_ORDER_SUBMIT_S3',
		'AO_PRAGATI_ORDER_SUBMIT_W1',
		'AO_PRAGATI_ORDER_SUBMIT_W2',
		'SAFETY_STOCK',
		'QUANTITY_NORM_DEFAULT_VALUE',
		'STOCK_NORM'
		);
		`
    )
};

exports.down = pgm => {};
