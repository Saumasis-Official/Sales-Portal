/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
    pgm.sql(`

    DO $$
    BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'infra' AND table_name = 'process_master') THEN
            DROP TABLE infra.process_master;
        END IF;
    END $$;
    
    DO $$
    BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'infra' AND table_name = 'process_log') THEN
            ALTER TABLE infra.process_log ALTER COLUMN "time" TYPE varchar USING "time"::varchar;
        END IF;
    END $$;

    
    CREATE TABLE IF NOT EXISTS infra.process_master (
        process_name varchar NOT NULL,
        priority int4 NOT NULL,
        run_time int4 not null,
        max_timeout int4 not null
    );
   
    CREATE TABLE if not exists infra.sap_masters (
	cfa_name varchar(255) NULL,
	cfa_id varchar(255) NULL,
	so_amendment_mt varchar NULL,
	so_mt_max_timeout int4 NULL,
	do_creation_mt varchar NULL,
	do_mt_max_timeout int4 NULL,
	so_amendment_gt varchar NULL,
	so_gt_max_timeout int4 NULL,
	do_creation_gt varchar NULL,
	do_gt_max_timeout int4 NULL);

    create table if not exists infra.asterisk_masters (
	process_name varchar(255) not null,
	expected_run_time int4 not null,
	max_time_out int4 not null);

    INSERT INTO infra.process_master (process_name, priority, run_time, max_timeout) VALUES
    ('SAP Credit Refresh', 1, 7, 20),
    ('DataLake Refresh', 2, 20, 40),
    ('Asterisk Run', 3, 35, 50),
    ('SAP Order Process', 4, 20, 40),
    ('FinalMart', 0, 0, 0);
    
    INSERT INTO infra.asterisk_masters (process_name, expected_run_time, max_time_out) VALUES
    ('AsteriskETLRun', 10, 20),
    ('AsteriskMTRun', 30, 40),
    ('AsteriskGTRun', 30, 40);

    INSERT INTO infra.sap_masters (cfa_name,cfa_id,so_amendment_mt,so_mt_max_timeout,do_creation_mt,do_mt_max_timeout,so_amendment_gt,so_gt_max_timeout,do_creation_gt,do_gt_max_timeout) VALUES
	 ('Goa','1238','SO_MT_1238',15,'DO_MT_1238',15,'SO_GT_1238',15,'DO_GT_1238',15),
	 ('Ghaziabad ','1426','SO_MT_1426',15,'DO_MT_1426',15,'SO_GT_1426',15,'DO_GT_1426',15),
	 ('Ghaziabad ','1214','SO_MT_1214',15,'DO_MT_1214',15,'SO_GT_1214',15,'DO_GT_1214',15),
	 ('Sonipat','1476','SO_MT_1476',15,'DO_MT_1476',15,'SO_GT_1476',15,'DO_GT_1476',15),
	 ('Dankuni','1430','SO_MT_1430',15,'DO_MT_1430',15,'SO_GT_1430',15,'DO_GT_1430',15),
	 ('Agra','1204','SO_MT_1204',15,'DO_MT_1204',15,'SO_GT_1204',15,'DO_GT_1204',15),
	 ('Pune','1229','SO_MT_1229',15,'DO_MT_1229',15,'SO_GT_1229',15,'DO_GT_1229',15),
	 ('Jaipur','1203','SO_MT_1203',15,'DO_MT_1203',15,'SO_GT_1203',15,'DO_GT_1203',15),
	 ('Ranchi','1265','SO_MT_1265',15,'DO_MT_1265',15,'SO_GT_1265',15,'DO_GT_1265',15),
	 ('Karnal','1418','SO_MT_1418',15,'DO_MT_1418',15,'SO_GT_1418',15,'DO_GT_1418',15),
	 ('Indore','1225','SO_MT_1225',15,'DO_MT_1225',15,'SO_GT_1225',15,'DO_GT_1225',15),
	 ('Ahmedabad','1253','SO_MT_1253',15,'DO_MT_1253',15,'SO_GT_1253',15,'DO_GT_1253',15),
	 ('Cuttack','1213','SO_MT_1213',15,'DO_MT_1213',15,'SO_GT_1213',15,'DO_GT_1213',15),
	 ('Trichy','1281','SO_MT_1281',15,'DO_MT_1281',15,'SO_GT_1281',15,'DO_GT_1281',15),
	 ('Bangalore','1438','SO_MT_1438',15,'DO_MT_1438',15,'SO_GT_1438',15,'DO_GT_1438',15),
	 ('Jammu','1416','SO_MT_1416',15,'DO_MT_1416',15,'SO_GT_1416',15,'DO_GT_1416',15),
	 ('Lucknow','1477','SO_MT_1477',15,'DO_MT_1477',15,'SO_GT_1477',15,'DO_GT_1477',15),
	 ('Silchar','1478','SO_MT_1478',15,'DO_MT_1478',15,'SO_GT_1478',15,'DO_GT_1478',15),
	 ('Ludhiana','1211','SO_MT_1211',15,'DO_MT_1211',15,'SO_GT_1211',15,'DO_GT_1211',15),
	 ('Coimbatore','1437','SO_MT_1437',15,'DO_MT_1437',15,'SO_GT_1437',15,'DO_GT_1437',15),
	 ('Bhiwandi','1257','SO_MT_1257',15,'DO_MT_1257',15,'SO_GT_1257',15,'DO_GT_1257',15),
	 ('Bhiwandi','1135','SO_MT_1135',15,'DO_MT_1135',15,'SO_GT_1135',15,'DO_GT_1135',15),
	 ('Sangli','1480','SO_MT_1480',15,'DO_MT_1480',15,'SO_GT_1480',15,'DO_GT_1480',15),
	 ('Vaishali','1439','SO_MT_1439',15,'DO_MT_1439',15,'SO_GT_1439',15,'DO_GT_1439',15),
	 ('Vizag','1296','SO_MT_1296',15,'DO_MT_1296',15,'SO_GT_1296',15,'DO_GT_1296',15),
	 ('Gorakhpur','1423','SO_MT_1423',15,'DO_MT_1423',15,'SO_GT_1423',15,'DO_GT_1423',15),
	 ('Hubli','1482','SO_MT_1482',15,'DO_MT_1482',15,'SO_GT_1482',15,'DO_GT_1482',15),
	 ('Kanpur','1205','SO_MT_1205',15,'DO_MT_1205',15,'SO_GT_1205',15,'DO_GT_1205',15),
	 ('Kanpur','1421','SO_MT_1421',15,'DO_MT_1421',15,'SO_GT_1421',15,'DO_GT_1421',15),
	 ('Raipur','1258','SO_MT_1258',15,'DO_MT_1258',15,'SO_GT_1258',15,'DO_GT_1258',15),
	 ('Haldwani ','1462','SO_MT_1462',15,'DO_MT_1462',15,'SO_GT_1462',15,'DO_GT_1462',15),
	 ('Guwahati','1495','SO_MT_1495',15,'DO_MT_1495',15,'SO_GT_1495',15,'DO_GT_1495',15),
	 ('Nagpur','1226','SO_MT_1226',15,'DO_MT_1226',15,'SO_GT_1226',15,'DO_GT_1226',15),
	 ('Patna','1579','SO_MT_1579',15,'DO_MT_1579',15,'SO_GT_1579',15,'DO_GT_1579',15),
	 ('Hyderabad','1483','SO_MT_1483',15,'DO_MT_1483',15,'SO_GT_1483',15,'DO_GT_1483',15),
	 ('Saharanpur','1484','SO_MT_1484',15,'DO_MT_1484',15,'SO_GT_1484',15,'DO_GT_1484',15),
	 ('Chennai-Fds','1275','SO_MT_1275',15,'DO_MT_1275',15,'SO_GT_1275',15,'DO_GT_1275',15),
	 ('Chennai-Bev','1137','SO_MT_1137',15,'DO_MT_1137',15,'SO_GT_1137',15,'DO_GT_1137',15),
	 ('Jabalpur','1481','SO_MT_1481',15,'DO_MT_1481',15,'SO_GT_1481',15,'DO_GT_1481',15),
	 ('Jorhat','1569','SO_MT_1569',15,'DO_MT_1569',15,'SO_GT_1569',15,'DO_GT_1569',15),
    ('Kothamangalam','1130','SO_MT_1130',15,'DO_MT_1130',15,'SO_GT_1130',15,'DO_GT_1130',15),
	 ('Vijayawada','1568','SO_MT_1568',15,'DO_MT_1568',15,'SO_GT_1568',15,'DO_GT_1568',15),
	 ('Tepla','1551','SO_MT_1551',15,'DO_MT_1551',15,'SO_GT_1551',15,'DO_GT_1551',15),
	 ('Varanasi','1208','SO_MT_1208',15,'DO_MT_1208',15,'SO_GT_1208',15,'DO_GT_1208',15),
	 ('Varanasi','1425','SO_MT_1425',15,'DO_MT_1425',15,'SO_GT_1425',15,'DO_GT_1425',15),
	 ('Siliguri','1429','SO_MT_1429',15,'DO_MT_1429',15,'SO_GT_1429',15,'DO_GT_1429',15);

    `)
};

exports.down = pgm => {
    pgm.sql(`
      DROP SCHEMA IF EXISTS infra;
      DROP TABLE IF EXISTS process_log;
      DROP TABLE IF EXISTS infra.process_master;
      DROP TABLE IF EXISTS infra.asterisk_masters;
      DROP TABLE IF EXISTS infra.sap_masters;
      `)
};
