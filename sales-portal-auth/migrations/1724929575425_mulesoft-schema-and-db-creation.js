/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {pgm.sql(`
-- Create the schema if it does not already exist
CREATE SCHEMA IF NOT EXISTS shopify;
 
-- Drop the table if it already exists
DROP TABLE IF EXISTS shopify.uk_shopify_duplicacy_check;
 
 
-- Create the table within the schema
CREATE TABLE shopify.uk_shopify_duplicacy_check (
id_number VARCHAR(15) NOT NULL,
order_number VARCHAR(20) NOT NULL,
tracking_id VARCHAR(15),
transaction_date TIMESTAMP,
allow_reprocess_flag VARCHAR(1),
reprocess_date TIMESTAMP,
reprocess_count NUMERIC(18, 0),
CONSTRAINT pk_uk_transaction_check PRIMARY KEY (id_number, order_number)
);
 
-- Create an index (implicitly created by the primary key constraint)
CREATE INDEX idx_transaction_check ON shopify.uk_shopify_duplicacy_check (id_number, order_number);
 
-- Cluster the table based on the index
CLUSTER shopify.uk_shopify_duplicacy_check USING idx_transaction_check;
 
SELECT current_database();


`);};

exports.down = pgm => {
    pgm.sql(`
    DROP TABLE IF EXISTS shopify.uk_shopify_duplicacy_check;
    `)
};
