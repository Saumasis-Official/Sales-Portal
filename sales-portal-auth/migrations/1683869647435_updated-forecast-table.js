/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.sql(`
        CREATE TABLE IF NOT EXISTS updated_forecast  (
            key bigserial NOT NULL PRIMARY KEY,
            updated_allocation numeric NOT NULL,
            updated_on timestamptz,
            updated_by character varying NOT NULL,
            forecast_key bigserial NOT NULL,
            CONSTRAINT fk_forecast_id
            FOREIGN KEY(forecast_key) 
	        REFERENCES forecast_data(key));`);
};

exports.down = (pgm) => {
  pgm.sql(`DROP TABLE IF EXISTS updated_forecast;`);
};
