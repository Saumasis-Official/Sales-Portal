import { PoolClient } from 'pg';
import PostgresqlConnection from '../lib/postgresqlConnection';
const conn = PostgresqlConnection.getInstance();
import logger from '../lib/logger';
import moment from 'moment';
import snowflakeConnection from '../lib/snowflakeConnection';
import { isProduction } from '../constant/constants';

export const CfaProcessModel = {
    /** Steps followed in the below function:
     *    -Extract process name & fetch log entries for the process name with event 'Start' and specified date.
     *    -Extract day from formatDate & fetch expected start times from process calendar.
     *    -Extract calendar date from table
     *    -Split expected start time into an array ex: [12:00,16:00]
     *    -Set end_time to end of day for last interval & Set end_time to next start time for other intervals.
     *    -Query to fetch log entries between start_time and end_time. Storing result in calenderBasedRecords.
     *    -Find index of first 'Start' event for 'FinalMart'
     *    -Filter out all 'FinalMart' records before this index.
     *    - Push filtered log entries to workflowCount[[],[],[]]
     *  * */

    async finalDataBasedOnId(formatDate: string) {
        let client: PoolClient | null = null;
        try {
            logger.info('inside CfaProcessModel -> final');
            const [day, month, year] = formatDate.split('.');
            const formattedDate = `${year}-${month}-${day}`;

            client = await conn.getReadClient();
            const fetchFinalMart = `select pm.process_name from infra.process_master pm where pm.priority  = 0`;
            const finalMartProcess = await client.query(fetchFinalMart);
            if (finalMartProcess.rows.length == 0) {
                return [];
            }
            const finalMart = finalMartProcess.rows[0].process_name;

            const finalMartQuery = `SELECT pl.id 
    FROM infra.process_log pl 
    WHERE pl.process_name = $1 
      AND pl."event" = 'Start' 
      AND pl.time ILIKE '%' || $2 || '%' `;
            const finalMartResponse = await client.query(finalMartQuery, [finalMart, formatDate]);
            const finalMartIds = finalMartResponse.rows.map((row) => row.id);

            if (finalMartIds.length === 0) {
                return [];
            }

            const calender = `select expected_starttime from infra.process_calender pc where full_date=$1`;
            const previousCalender = `select expected_starttime  from infra.previous_process_calender ppc where full_date=$1`;
            const calenderResponse = await client.query(calender, [formattedDate]);
            const previousCalenderResponse = await client.query(previousCalender, [formattedDate]);

            const calenderData = calenderResponse.rows[0];
            const previousCalenderData = previousCalenderResponse.rows[0];

            let startTimes = [];
            const workflowCount: any[][] = [];

            const currentDate = new Date();
            const currentMonth = String(currentDate.getMonth() + 1).padStart(2, '0');
            const currentYear = String(currentDate.getFullYear());

            if (month === currentMonth && year === currentYear && calenderResponse?.rows?.length > 0) {
                startTimes = calenderData?.expected_starttime.split(',');
            } else if (previousCalenderResponse.rows?.length > 0) {
                startTimes = previousCalenderData?.expected_starttime.split(',');
            }

            let end_time = '';
            let start_time = '';
            for (let i = 0; i < startTimes.length; i++) {
                if (i == startTimes.length - 1) {
                    start_time = formatDate.split(' ')[0] + ' ' + startTimes[i];
                    end_time = formatDate.split(' ')[0] + ' ' + '23:59:59';
                } else {
                    start_time = formatDate.split(' ')[0] + ' ' + startTimes[i];
                    end_time = formatDate.split(' ')[0] + ' ' + startTimes[i + 1];
                }
                const query = `select * from infra.process_log pl where pl.time between $1 and $2 order by pl.id desc; `;

                const response = await client.query(query, [start_time, end_time]);
                let calenderBasedRecords = response.rows;
                // Find the index of the first 'start' event for 'FinalMart'
                const firstStartIndex = calenderBasedRecords.findIndex((record: any) => {
                    return record.process_name === 'FinalMart' && record.event === 'Start';
                });

                // If a 'start' event is found, remove all 'FinalMart' records before this index
                if (firstStartIndex !== -1) {
                    calenderBasedRecords = calenderBasedRecords.filter((record: any, index: number) => {
                        return !(record.process_name === 'FinalMart' && index > firstStartIndex);
                    });
                }
                workflowCount.push(calenderBasedRecords);
            }

            return { workflowCount, workflowstartTimes: startTimes?.length > 0 ? startTimes : [] };
        } catch (error) {
            logger.error(`Error in CfaProcessModel.finalDataBasedOnId`, error);
            return null;
        } finally {
            if (client != null) client.release();
        }
    },

    async creditRefreshData(formatDate: string, workflow: any) {
        let client: PoolClient | null = null;
        try {
            logger.info('inside CfaProcessModel -> creditRefreshData');

            client = await conn.getReadClient();
            const fetchFinalMart = `select pm.process_name from infra.process_master pm where pm.priority  = 0`;
            const finalMartProcess = await client.query(fetchFinalMart);
            const finalMart = finalMartProcess.rows[0].process_name;

            const startTimes = workflow.workflowstartTimes;
            const pairs: any = [];
            let end_time = '';
            let start_time = '';
            for (let i = 0; i < startTimes.length; i++) {
                if (i == startTimes.length - 1) {
                    start_time = formatDate.split(' ')[0] + ' ' + startTimes[i];
                    end_time = formatDate.split(' ')[0] + ' ' + '23:59:59';
                } else {
                    start_time = formatDate.split(' ')[0] + ' ' + startTimes[i];
                    end_time = formatDate.split(' ')[0] + ' ' + startTimes[i + 1];
                }
                const creditRefreshQuery = `WITH finalmart_start AS (
          SELECT cr2.id, cr2.time,
            ROW_NUMBER() OVER (ORDER BY cr2.id) AS rn
          FROM infra.process_log cr2
          WHERE REPLACE(cr2.process_name, ' ', '') = $1
            AND REPLACE(cr2.event, ' ', '') = 'Start'
            AND cr2.time BETWEEN $2 AND $3
        ),
        credit_refresh_events AS (
          SELECT cr.id, cr.status, cr.time, cr.event, cr.process_name,
            fm.rn AS finalmart_rn
          FROM infra.process_log cr
          JOIN finalmart_start fm ON cr.id < fm.id
          WHERE REPLACE(cr.process_name, ' ', '') = 'CreditRefresh'
            AND (REPLACE(cr.event, ' ', '') = 'Start' OR REPLACE(cr.event, ' ', '') = 'End')
        )
        SELECT DISTINCT ON (id) id, status, time, event, process_name
        FROM (
          SELECT cr.*,
            ROW_NUMBER() OVER (PARTITION BY finalmart_rn, REPLACE(cr.event, ' ', '') ORDER BY cr.id DESC) AS rn
          FROM credit_refresh_events cr
        ) sub
        WHERE rn = 1
        ORDER BY id, finalmart_rn, id DESC;`;
                const creditRefreshResponse = await client.query(creditRefreshQuery, [finalMart, start_time, end_time]);
                const creditRefreshProcess = creditRefreshResponse.rows;
                if (creditRefreshProcess.length > 0) {
                    let lastStart: any = null;
                    creditRefreshProcess.forEach((row: any) => {
                        if (row.event === 'Start') {
                            lastStart = row;
                        } else if (row.event === 'End' && lastStart) {
                            pairs.push({ ...lastStart, start_time: lastStart.time, end_time: row.time });
                            lastStart = null;
                        }
                    });
                }
            }
            const creditRefreshData = pairs.filter((pair: any) => pair != null && pair != undefined);
            return creditRefreshData;
        } catch (error) {
            logger.error(`Error in CfaProcessModel.creditRefreshData`, error);
            return null;
        } finally {
            if (client != null) client.release();
        }
    },

    async dataLakeRefreshData(formatDate: string, workflow: any) {
        let client: PoolClient | null = null;
        try {
            logger.info('inside CfaProcessModel -> dataLakeRefreshData');
            client = await conn.getReadClient();

            const processName = `SELECT pm.process_name FROM infra.process_master pm ORDER BY pm.priority ASC; `;
            const processNameResponse = await client.query(processName);
            const proceess_name = processNameResponse.rows;

            const processLog = `select pl.id, pl.process_name ,pl."time" ,pl."event" ,pl.status from infra.process_log pl where pl."time" ilike '%' || $1 || '%'and pl."process_name" = $2 order by pl.id asc; `;
            const finalMartQuery = await client.query(processLog, [formatDate, proceess_name[0].process_name]);
            // const finalMartData = finalMartQuery.rows;
            const pairs: any[] = [];

            for (const subArray of workflow.workflowCount) {
                if (subArray.length > 0) {
                    const data = subArray.filter((row: any) => {
                        if (row.process_name === 'FinalMart') {
                            return row;
                        }
                    });
                    pairs.push(data);
                }
            }

            const obj = pairs
                .filter((pair: any) => pair !== undefined && pair !== null)
                .map((pair: any) => {
                    if (pair.length > 0) {
                        const start = pair.find((row: any) => row.event === 'Start');
                        const end = pair.find((row: any) => row.event === 'End');
                        return { ...start, start_time: start ? start.time : null, end_time: end ? end.time : null };
                    }
                    return null; // Handle case where pair is empty
                })
                .filter((pair: any) => pair !== null);

            return obj.filter((pair: any) => pair !== null);
        } catch (error) {
            logger.error(`Error in CfaProcessModel.dataLakeRefreshData`, error);
            return null;
        } finally {
            if (client != null) client.release();
        }
    },

    async asteriskData(formatDate: string, workflow: any) {
        let client: PoolClient | null = null;
        try {
            logger.info('inside CfaProcessModel -> asteriskData');
            client = await conn.getReadClient();
            const finalData: any[] = [];

            for (const subArray of workflow.workflowCount) {
                if (subArray.length > 0) {
                    const startId = subArray[subArray.length - 1].id;
                    const endId = subArray[0].id;
                    const asteriskQuery = `WITH events AS (
                            SELECT 
                              ast.id,
                              ast.process_name,
                              ast."event",
                              ast.status,
                              ast.time,
                              CASE
                                WHEN TRIM(ast.process_name) ILIKE '%ETL%'
                                AND TRIM(ast."event") = 'Start' THEN ast.time
                              END AS START_TIME,
                              CASE
                                WHEN TRIM(ast.process_name) ILIKE '%GT%'
                                AND TRIM(ast."event") = 'End' THEN ast.time
                                WHEN TRIM(ast.process_name) ILIKE '%MT%'
                                AND TRIM(ast."event") = 'End' THEN ast.time
                              END AS END_TIME,
                              ROW_NUMBER() OVER (PARTITION BY ast.process_name, ast."event" ORDER BY ast.time DESC) AS rn
                            FROM infra.process_log ast
                            WHERE TRIM(ast."time") ILIKE '%' || $1 || '%'
                              AND TRIM(ast.process_name) ILIKE '%Run%'
                              AND ast.id BETWEEN $2 AND $3
                          )
                          SELECT id, process_name, "event", status, START_TIME, GREATEST(END_TIME) AS END_TIME
                          FROM events
                          WHERE (START_TIME IS NOT NULL OR END_TIME IS NOT NULL)
                            AND rn = 1;`;

                    const asteriskResponse = await client.query(asteriskQuery, [formatDate, startId, endId]);
                    const raws = asteriskResponse.rows;
                    if (raws.length > 0) {
                        const asteriskProcess: any = raws.find((row) => row.process_name === 'AsteriskETLRun');
                        if (asteriskProcess) {
                            const filteredRows = raws.filter((row) => row.process_name !== 'AsteriskETLRun');

                            // Endtime should be later of AsteriskMTRun end time, AsteriskGTRun end time
                            let endTime: any = null;
                            for (let i = 0; i < filteredRows.length; i++) {
                                const record = filteredRows[i];
                                const toDate = moment(record.end_time.trim(), 'DD.MM.YYYY HH:mm:ss').format('DD.MM.YYYY HH:mm:ss');
                                if (record.process_name.includes('GT') || (record.process_name.includes('MT') && record.event.trim() === 'End')) {
                                    if (endTime === null || toDate > endTime) {
                                        endTime = toDate;
                                    }
                                }
                            }

                            const details = `WITH latest_events AS (
              SELECT ast.process_name, ast."event", ast.status, ast."time",
                ROW_NUMBER() OVER (PARTITION BY TRIM(ast.process_name), TRIM(ast."event") ORDER BY ast.id DESC) AS rn
              FROM infra.process_log ast
              WHERE TRIM(ast."time") ILIKE '%' || $1 || '%'
                AND TRIM(ast.process_name) ILIKE '%Run%'
                AND ast.id BETWEEN $2 AND $3
            )
            SELECT process_name, "event", status, "time"
            FROM latest_events
            WHERE rn = 1;`;

                            const detailResponse = await client.query(details, [formatDate, startId, endId]);

                            const detailData = detailResponse.rows;

                            const headerDetails: { [key: string]: any } = {};

                            Object.values(detailData).forEach((entry: any) => {
                                const processName = entry.process_name.trim();
                                const event = entry.event.trim();
                                const time = entry.time.trim();

                                if (!headerDetails[processName]) {
                                    headerDetails[processName] = { header: headerDetails[processName], headerStartTime: '', headerEndTime: '' };
                                }

                                if (event === 'Start') {
                                    headerDetails[processName].headerStartTime = time;
                                } else if (event === 'End') {
                                    headerDetails[processName].headerEndTime = time;
                                }
                            });

                            finalData.push({ ...asteriskProcess, end_time: endTime || '', headerDetails: { ...headerDetails } });
                        }
                    }
                    // Push empty array if asteriskProcess is not found to avoid replacing the index
                    // else {
                    //   finalData.push({
                    //     process_name: "AsteriskETLRun",
                    //     start_time: "",
                    //     end_time: "",
                    //     headerDetails: {},
                    //   });
                    // }
                }
            }
            return finalData;
        } catch (error) {
            logger.error(`Error in CfaProcessModel.asteriskData`, error);
            return null;
        } finally {
            if (client != null) client.release();
        }
    },

    async sapAmendmentData(formatDate: string, workflow: any) {
        let client: PoolClient | null = null;
        try {
            logger.info('inside CfaProcessModel -> sapAmendmentData');
            client = await conn.getReadClient();

            let finalData: any[] = [];

            for (const subArray of workflow.workflowCount) {
                const isFinalMaltPresent = subArray.some(item =>
                    item.process_name && item.process_name.includes('FinalMart')
                );
                if (subArray.length > 0 && isFinalMaltPresent) {
                    const startId = subArray[subArray.length - 1].id;
                    const endId = subArray[0].id;
                    const sapAmdQuery = `SELECT SUBSTRING(pl.process_name FROM 1 FOR 4) AS process_name_substring,
                pl.id,pl.process_name ,pl."time" ,pl.status ,pl.event
            FROM infra.process_log pl
            WHERE (pl.process_name ILIKE '%SO%' OR pl.process_name ILIKE '%DO%')
              AND pl.time ILIKE '%' || $1 || '%'
            AND pl.id BETWEEN $2 AND $3
            ORDER BY pl.id asc;`;

                    const sapAmdResponse = await client.query(sapAmdQuery, [formatDate, startId, endId]);
                    const totalRecords = sapAmdResponse.rows;
                    let startTime: any = null;
                    let endTime: any = null;
                    for (let i = 0; i < totalRecords.length; i++) {
                        const record = totalRecords[i];
                        const toDate = moment(record.time, 'DD.MM.YYYY HH:mm:ss').format('DD.MM.YYYY HH:mm:ss');
                        // End time should be latest of SO Amendment GT end time and DO Creation GT end time
                        if (record.process_name.includes('GT') && record.event === 'End') {
                            if (endTime === null || toDate > endTime) {
                                endTime = toDate;
                            }
                        }
                        // Start time should be taken as the earliest of SO Amendment GT start time and DO Creation GT start time
                        if (record.process_name.includes('GT') && record.event === 'Start') {
                            if (startTime === null || toDate < startTime) {
                                startTime = toDate;
                            }
                        }
                    }
                    const cfaDetails = `select cfa_id, cfa_name from infra.sap_masters sm `;
                    const cfaDetailsResponse = await client.query(cfaDetails);
                    const cfaDetailsData = cfaDetailsResponse.rows;
                    const updatedCfaDetailsData = cfaDetailsData.map((cfa: any) => {
                        const cfaId = cfa.cfa_id;
                        let updatedCfa = { ...cfa };

                        totalRecords.forEach((record: any) => {
                            const trimmedProcessName = record.process_name.trim();
                            const idMatch = trimmedProcessName.match(/(\d+)/);
                            if (idMatch.includes(cfaId) && record.event === 'Start' && trimmedProcessName.includes('DO_MT')) {
                                updatedCfa = { ...updatedCfa, do_mt_start_time: record.time };
                            }
                            if (idMatch.includes(cfaId) && record.event === 'End' && trimmedProcessName.includes('DO_MT')) {
                                updatedCfa = { ...updatedCfa, do_mt_end_time: record.time };
                            }
                            if (idMatch.includes(cfaId) && record.event === 'Start' && trimmedProcessName.includes('SO_MT')) {
                                updatedCfa = { ...updatedCfa, so_mt_start_time: record.time };
                            }
                            if (idMatch.includes(cfaId) && record.event === 'End' && trimmedProcessName.includes('SO_MT')) {
                                updatedCfa = { ...updatedCfa, so_mt_end_time: record.time };
                            }
                            if (idMatch.includes(cfaId) && record.event === 'Start' && trimmedProcessName.includes('SO_GT')) {
                                updatedCfa = { ...updatedCfa, so_gt_start_time: record.time };
                            }
                            if (idMatch.includes(cfaId) && record.event === 'End' && trimmedProcessName.includes('SO_GT')) {
                                updatedCfa = { ...updatedCfa, so_gt_end_time: record.time };
                            }
                            if (idMatch.includes(cfaId) && record.event === 'Start' && trimmedProcessName.includes('DO_GT')) {
                                updatedCfa = { ...updatedCfa, do_gt_start_time: record.time };
                            }
                            if (idMatch.includes(cfaId) && record.event === 'End' && trimmedProcessName.includes('DO_GT')) {
                                updatedCfa = { ...updatedCfa, do_gt_end_time: record.time };
                            }
                        });
                        return updatedCfa;
                    });

                    finalData.push({ process_name: 'SAP Order Process', startTime: startTime, endTime: endTime, headerDetails: { ...updatedCfaDetailsData } });
                }
            }

            return finalData;
        } catch (error) {
            logger.error(`Error in CfaProcessModel.sapAmendmentData`, error);
            return null;
        } finally {
            if (client != null) client.release();
        }
    },

    async masterData() {
        let client: PoolClient | null = null;
        try {
            logger.info('inside CfaProcessModel -> masterData');

            client = await conn.getReadClient();
            const asteriskQuery = `select * from infra.asterisk_masters am`;
            const asteriskResponse = await client.query(asteriskQuery);
            const asteriskProcessMaster = asteriskResponse.rows;

            const process_Master = `SELECT * FROM infra.process_master pm WHERE pm.priority  > 0 ORDER BY pm.priority ASC;`;
            const processMasterResponse = await client.query(process_Master);
            const processMaster = processMasterResponse.rows;

            const sapAmendmentQuery = `SELECT * FROM infra.sap_masters sam;`;
            const sapAmendmentResponse = await client.query(sapAmendmentQuery);
            const sapAmendmentProcessMaster = sapAmendmentResponse.rows;

            const result = { processMaster, asteriskProcessMaster, sapAmendmentProcessMaster };
            return result;
        } catch (error) {
            logger.error(`Error in CfaProcessModel.masterData`, error);
            return null;
        } finally {
            if (client != null) client.release();
        }
    },

    async getFormatedData(data: any) {
        try {
            const finalMartData = data.filter((row: any) => row.process_name === 'FinalMart').map((row: any, index: number) => ({ ...row, index }));

            const creditRefreshData = data.filter((row: any) => row.process_name.trim() === 'CreditRefresh').map((row: any, index: number) => ({ ...row, index }));

            const asteriskData = data.filter((row: any) => row.process_name === 'AsteriskETLRun').map((row: any, index: number) => ({ ...row, index }));

            const sapAmendmentData = data.filter((row: any) => row.process_name === 'SAP Order Process').map((row: any, index: number) => ({ ...row, index }));

            const combinedData = finalMartData.map((item: any, index: number) => {
                return [
                    { header: 'SAP Credit Refresh', headerStartTime: creditRefreshData[index]?.start_time || '', headerEndTime: creditRefreshData[index]?.end_time || '' },
                    { header: 'DataLake Refresh', headerStartTime: creditRefreshData[index]?.start_time || '', headerEndTime: item.end_time || '' },
                    {
                        header: 'Asterisk Run',
                        headerStartTime: asteriskData[index]?.start_time || '',
                        headerEndTime: asteriskData[index]?.end_time || '',
                        headerDetails: {
                            AsteriskETLRun: {
                                headerStartTime: asteriskData[index]?.headerDetails?.AsteriskETLRun?.headerStartTime || '',
                                headerEndTime: asteriskData[index]?.headerDetails?.AsteriskETLRun?.headerEndTime || '',
                            },
                            AsteriskGTRun: {
                                headerStartTime: asteriskData[index]?.headerDetails?.AsteriskGTRun?.headerStartTime || '',
                                headerEndTime: asteriskData[index]?.headerDetails?.AsteriskGTRun?.headerEndTime || '',
                            },
                            AsteriskMTRun: {
                                headerStartTime: asteriskData[index]?.headerDetails?.AsteriskMTRun?.headerStartTime || '',
                                headerEndTime: asteriskData[index]?.headerDetails?.AsteriskMTRun?.headerEndTime || '',
                            },
                        },
                    },
                    {
                        header: 'SAP Order Process',
                        headerStartTime: sapAmendmentData[index]?.startTime || '',
                        headerEndTime: sapAmendmentData[index]?.endTime || '',
                        headerDetails: sapAmendmentData[index]?.startTime ? sapAmendmentData[index]?.headerDetails : {},
                    },
                ];
            });
            return combinedData;
        } catch (error) {
            console.log('Error in CfaProcessModel.getFormatedData', error);
            return null;
        }
    },

    async getCfaProcessLogs(date: string, channel: string[]) {
        let client: PoolClient | null = null;
        try {
            logger.info('inside CfaProcessModel -> getCfaProcessLogs');
            const formattedString = moment(date).format('DD.MM.YYYY HH:mm:ss');
            const formatDate = formattedString.split(' ')[0];

            client = await conn.getReadClient();
            let finalData: any = [];

            const workflow = await this.finalDataBasedOnId(formatDate);
            if (workflow.length == 0) {
                return { log_result: [], masters: [] };
            }
            const dataLakeRefreshProcess = await this.dataLakeRefreshData(formatDate, workflow);
            const creditRefreshProcess = await this.creditRefreshData(formatDate, workflow);
            const asteriskProcess = await this.asteriskData(formatDate, workflow);
            const sapAmendmentProcess = await this.sapAmendmentData(formatDate, workflow);
            const masters = await this.masterData();

            finalData = [
                ...finalData,
                ...(creditRefreshProcess.length > 0 ? creditRefreshProcess : []),
                ...(asteriskProcess.length > 0 ? asteriskProcess : []),
                ...(dataLakeRefreshProcess.length > 0 ? dataLakeRefreshProcess : []),
                ...(sapAmendmentProcess.length > 0 ? sapAmendmentProcess : []),
            ];

            let getfinalFormatedData = await this.getFormatedData(finalData, masters, workflow);

            let log_result: any[] = [];
            let sequenceCounter = 0;
            workflow.workflowCount.forEach((workflowItem: any[]) => {
                const hasFinalMart = workflowItem.some((item: any) => item.process_name === 'FinalMart');
                if (hasFinalMart) {
                    log_result.push(getfinalFormatedData && getfinalFormatedData[sequenceCounter] ? getfinalFormatedData[sequenceCounter] : []);
                    sequenceCounter++;
                } else {
                    log_result.push([]);
                }
            });
            log_result = log_result.map((item: any) => {
                if (Array.isArray(item) && item.length === 0) {
                    return [
                        {
                            header: 'SAP Credit Refresh',
                            headerStartTime: '-',
                            headerEndTime: '-',
                        },
                        {
                            header: 'DataLake Refresh',
                            headerStartTime: '-',
                            headerEndTime: '-',
                        },
                        {
                            header: 'Asterisk Run',
                            headerStartTime: '-',
                            headerEndTime: '-',
                            headerDetails: {},
                        },
                        {
                            header: 'SAP Order Process',
                            headerStartTime: '-',
                            headerEndTime: '-',
                            headerDetails: {},
                        },
                    ];
                }
                return item;
            });
            const table_data = await this.snowFlakeDirectCall(date, channel);
            const errorData = await this.snowFlakeErrorLogs(date, channel);
            return { log_result, masters, table_data, errorData };
        } catch (error) {
            logger.error(`Error in CfaProcessModel.getCfaProcessLogs`, error);
            return null;
        } finally {
            if (client != null) client.release();
        }
    },

    async snowFlakeDirectCall(date: string, channel: string[]) {
        let client: PoolClient | null = null;
        try {
            logger.info('inside CfaProcessModel -> snowFlakeDirectCall');
            const formattedString = moment(date).format('YYYY-MM-DD HH:mm:ss');
            const formatDate = formattedString.split(' ')[0];

            client = await conn.getReadClient();

            const calender = `select expected_starttime from infra.process_calender pc where full_date=$1`;
            const previousCalender = `select expected_starttime  from infra.previous_process_calender ppc where full_date=$1`;
            const calenderResponse = await client.query(calender, [formatDate]);
            const previousCalenderResponse = await client.query(previousCalender, [formatDate]);

            const calenderData = calenderResponse.rows[0];
            const previousCalenderData = previousCalenderResponse.rows[0];

            const [year, month, day] = formatDate.split('-');

            const currentDate = new Date();
            const currentMonth = String(currentDate.getMonth() + 1).padStart(2, '0');
            const currentYear = String(currentDate.getFullYear());

            let startTimes = [];
            const workflowCount: any[][] = [];
            if (month === currentMonth && year === currentYear && calenderResponse?.rows?.length > 0) {
                startTimes = calenderData?.expected_starttime.split(',');
            } else if (previousCalenderResponse.rows?.length > 0) {
                startTimes = previousCalenderData?.expected_starttime.split(',');
            }

            let end_time = '';
            let start_time = '';

            for (let i = 0; i < startTimes.length; i++) {
                let final_so = 0;
                let final_allocated_so = 0;
                let final_do_created = 0;
                let final_do_failed = 0;
                let final_do_conv = 0;
                let final_so_cv = 0;
                let final_allocated_so_cv = 0;
                let final_do_created_cv = 0;
                let final_do_conv_cv = 0;
                let final_do_failed_cv = 0;
                let final_manual_do_cv = 0;
                if (i == startTimes.length - 1) {
                    start_time = date.split(' ')[0] + ' ' + startTimes[i];
                    end_time = date.split(' ')[0] + ' ' + '23:59:59';
                } else {
                    start_time = date.split(' ')[0] + ' ' + startTimes[i];
                    end_time = date.split(' ')[0] + ' ' + startTimes[i + 1];
                }
                const snowFlakeStartTime = start_time.split(' ')[1] + ':00';
                const snowFlakeEndTime = end_time.split(' ')[1] === '23:59:59' ? end_time.split(' ')[1] : end_time.split(' ')[1] + ':00';

                let manualDoQuery;
                let doStatsquery;

                if (isProduction()) {
                    manualDoQuery = `SELECT COUNT(DELIVERYDOCUMENT) AS Manual_DO_Count
                    FROM PRD_PSO_DM_DB.PSO_DM_CFA_CENTRAL_BR.CFA_ALLOCATION_MANUALDO_STATS where RUN_DATE::DATE = ? and CAST(RUN_TIME AS TIME) between ? and ?`

                    //check for table 
                    doStatsquery = `select CFA_CODE,CFA_NAME,
                   SUM(TOTAL_SO) as total_so_sum,SUM(ALLOTTED_SO) as allotted_so_sum,SUM(DO_CREATED) as do_created_sum, (SUM(ALLOTTED_SO) - SUM(DO_CREATED)) as do_failed, 
                   CASE WHEN SUM(ALLOTTED_SO) = 0 THEN 0 ELSE ROUND((SUM(DO_CREATED) / SUM(ALLOTTED_SO)) * 100,1) END as do_conversion,
                   SUM(TOTAL_SO_QTY_IN_CV) as total_so_cv,SUM(TOTAL_ALLOTTED_QTY_IN_CV) as allotted_so_cv, SUM(TOTAL_DO_QTY_IN_CV) as do_created_cv,
                   CASE WHEN SUM(TOTAL_ALLOTTED_QTY_IN_CV) = 0 THEN 0 ELSE ROUND((SUM(TOTAL_DO_QTY_IN_CV) / SUM(TOTAL_ALLOTTED_QTY_IN_CV)) * 100,1) END as do_conversion_cv
                   from PRD_PSO_DM_DB.PSO_DM_CFA_CENTRAL_BR.CFA_ALLOCATION_AUTODO_STATS where RUN_DATE::DATE = ? AND CAST(RUN_TIME AS TIME) between ? and ? AND CFA_NAME IS NOT NULL AND CFA_CODE IS NOT NULL`;
                }
                else {
                    manualDoQuery = `SELECT COUNT(DELIVERYDOCUMENT) AS Manual_DO_Count
                    FROM DEV_PSO_DM_DB.PSO_DM_CFA_CENTRAL_BR.CFA_ALLOCATION_MANUALDO_STATS where RUN_DATE::DATE = ? and CAST(RUN_TIME AS TIME) between ? and ?`

                    doStatsquery = `select CFA_CODE,CFA_NAME,
                    SUM(TOTAL_SO) as total_so_sum,SUM(ALLOTTED_SO) as allotted_so_sum,SUM(DO_CREATED) as do_created_sum, (SUM(ALLOTTED_SO) - SUM(DO_CREATED)) as do_failed, 
                    CASE WHEN SUM(ALLOTTED_SO) = 0 THEN 0 ELSE ROUND((SUM(DO_CREATED) / SUM(ALLOTTED_SO)) * 100,1) END as do_conversion,
                    SUM(TOTAL_SO_QTY_IN_CV) as total_so_cv,SUM(TOTAL_ALLOTTED_QTY_IN_CV) as allotted_so_cv, SUM(TOTAL_DO_QTY_IN_CV) as do_created_cv,
                    CASE WHEN SUM(TOTAL_ALLOTTED_QTY_IN_CV) = 0 THEN 0 ELSE ROUND((SUM(TOTAL_DO_QTY_IN_CV) / SUM(TOTAL_ALLOTTED_QTY_IN_CV)) * 100,1) END as do_conversion_cv
                    from DEV_PSO_DM_DB.PSO_DM_CFA_CENTRAL_BR.CFA_ALLOCATION_AUTODO_STATS where RUN_DATE::DATE = ? AND CAST(RUN_TIME AS TIME) between ? and ? AND CFA_NAME IS NOT NULL AND CFA_CODE IS NOT NULL`;
                }
 
                const manualDoQueryParams = [formatDate, snowFlakeStartTime, snowFlakeEndTime]
                const queryParams = [formatDate, snowFlakeStartTime, snowFlakeEndTime];
       
                if (channel && channel.length > 0) {
                    doStatsquery += ` AND CHANNEL IN (${channel.map(() => '?').join(', ')})`;
                    queryParams.push(...channel);
                    manualDoQuery += ` AND CHANNEL IN (${channel.map(() => '?').join(', ')})`;
                    manualDoQueryParams.push(...channel);
                } else {
                    doStatsquery += ` AND CHANNEL in ('GT', 'MT')`;
                    manualDoQuery += ` AND CHANNEL in ('GT', 'MT')`;
                }
                doStatsquery += ` GROUP BY CFA_CODE,CFA_NAME`;

                const response = await snowflakeConnection.query(doStatsquery, queryParams);
                const manualDoResponse = await snowflakeConnection.query(manualDoQuery, manualDoQueryParams);
                const calenderBasedRecords = response;
                workflowCount.push(calenderBasedRecords);
                calenderBasedRecords.forEach((record) => {
                    final_so += record.TOTAL_SO_SUM;
                    final_allocated_so += record.ALLOTTED_SO_SUM;
                    final_do_created += record.DO_CREATED_SUM;
                    final_do_failed = final_allocated_so - final_do_created;
                    final_do_conv = (final_do_created / final_allocated_so) * 100;
                    final_so_cv += record.TOTAL_SO_CV;
                    final_allocated_so_cv += record.ALLOTTED_SO_CV;
                    final_do_created_cv += record.DO_CREATED_CV;
                    final_do_failed_cv = final_allocated_so_cv - final_do_created_cv;
                    final_do_conv_cv = (final_do_created_cv / final_allocated_so_cv) * 100;
                });
                manualDoResponse.forEach((manualDoRecord) => {
                    calenderBasedRecords.push({
                        ...manualDoRecord,
                        FINAL_SO: final_so,
                        FINAL_ALLOTTED_SO: final_allocated_so,
                        FINAL_DO_CREATED: final_do_created,
                        FINAL_DO_FAILED: final_do_failed,
                        FINAL_DO_CONV: parseFloat(final_do_conv.toFixed(1)),
                        FINAL_SO_CV: parseFloat(final_so_cv.toFixed(1)),
                        FINAL_ALLOTTED_SO_CV: final_allocated_so_cv,
                        FINAL_DO_CREATED_CV: parseFloat(final_do_created_cv.toFixed(1)),
                        FINAL_DO_CONV_CV: parseFloat(final_do_conv_cv.toFixed(1)),
                        FINAL_DO_FAILED_CV: parseFloat(final_do_failed_cv.toFixed(1)),
                        FINAL_MANUAL_DO_CV: final_manual_do_cv,
                    });
                });

            }
            return { do_stats: workflowCount };
        } catch (error) {
            logger.error(`Error in CfaProcessModel.snowFlakeDirectCall`, error);
            return null;
        } finally {
            if (client != null) client.release();
        }
    },

    async snowFlakeErrorLogs(date: string, channel: string[]) {
        let client: PoolClient | null = null;
        try {
            logger.info('inside CfaProcessModel -> snowFlakeErrorLogs');
            const formattedString = moment(date).format('YYYY-MM-DD HH:mm:ss');
            const formatDate = formattedString.split(' ')[0];

            client = await conn.getReadClient();

            const calender = `select expected_starttime from infra.process_calender pc where full_date=$1`;
            const previousCalender = `select expected_starttime  from infra.previous_process_calender ppc where full_date=$1`;
            const calenderResponse = await client.query(calender, [formatDate]);
            const previousCalenderResponse = await client.query(previousCalender, [formatDate]);

            const calenderData = calenderResponse.rows[0];
            const previousCalenderData = previousCalenderResponse.rows[0];

            const [year, month, day] = formatDate.split('-');

            const currentDate = new Date();
            const currentMonth = String(currentDate.getMonth() + 1).padStart(2, '0');
            const currentYear = String(currentDate.getFullYear());

            let startTimes = [];
            const workflowCount: any[][] = [];
            if (month === currentMonth && year === currentYear && calenderResponse?.rows?.length > 0) {
                startTimes = calenderData?.expected_starttime.split(',');
            } else if (previousCalenderResponse.rows?.length > 0) {
                startTimes = previousCalenderData?.expected_starttime.split(',');
            }
            let end_time = '';
            let start_time = '';

            for (let i = 0; i < startTimes.length; i++) {
                let errorSum = 0;
                let contribution = 0;
                if (i == startTimes.length - 1) {
                    start_time = date.split(' ')[0] + ' ' + startTimes[i];
                    end_time = date.split(' ')[0] + ' ' + '23:59:59';
                } else {
                    start_time = date.split(' ')[0] + ' ' + startTimes[i];
                    end_time = date.split(' ')[0] + ' ' + startTimes[i + 1];
                }
                const snowFlakeStartTime = start_time.split(' ')[1] + ':00';
                const snowFlakeEndTime = end_time.split(' ')[1] === '23:59:59' ? end_time.split(' ')[1] : end_time.split(' ')[1] + ':00';

                let errorLogQuery;
                if (isProduction()) {
                    errorLogQuery = `select ERROR_TEXT1, count(ERROR_TEXT1) as count, (count(ERROR_TEXT1)/(select count(ERROR_TEXT1) from PRD_PSO_DM_DB.PSO_DM_CFA_CENTRAL_BR.CFA_ALLOCATION_ERROR_LOG 
                                     where RUN_DATE::DATE = ? AND run_time between ? and ? ))*100 as contribution
                                     from PRD_PSO_DM_DB.PSO_DM_CFA_CENTRAL_BR.CFA_ALLOCATION_ERROR_LOG 
                                     where RUN_DATE::DATE = ? AND run_time between ? and ? `;
                } else {
                    errorLogQuery = `select ERROR_TEXT1, count(ERROR_TEXT1) as count, (count(ERROR_TEXT1)/(select count(ERROR_TEXT1) from DEV_PSO_DM_DB.PSO_DM_CFA_CENTRAL_BR.CFA_ALLOCATION_ERROR_LOG 
                                     where RUN_DATE::DATE = ? AND run_time between ? and ? ))*100 as contribution
                                     from DEV_PSO_DM_DB.PSO_DM_CFA_CENTRAL_BR.CFA_ALLOCATION_ERROR_LOG 
                                      where RUN_DATE::DATE = ? AND run_time between ? and ? `;
                }


                const queryParams = [formatDate, snowFlakeStartTime, snowFlakeEndTime, formatDate, snowFlakeStartTime, snowFlakeEndTime];
                if (channel && channel.length > 0) {
                    errorLogQuery += ` AND CHANNEL IN (${channel.map(() => '?').join(', ')})`;
                    queryParams.push(...channel);
                } else {
                    errorLogQuery += ` AND CHANNEL in ('GT', 'MT')`;
                }
                errorLogQuery += `GROUP BY ERROR_TEXT1 ORDER BY count desc`;
                const response = await snowflakeConnection.query(errorLogQuery, queryParams);
                const calenderBasedRecords = response;
                workflowCount.push(calenderBasedRecords);
                calenderBasedRecords.forEach((record) => {
                    errorSum += record.COUNT;
                    contribution += record.CONTRIBUTION;
                });
                calenderBasedRecords.push({ total: errorSum, contribution: parseFloat(contribution.toFixed(1)) });
            }
            return { errorLogs: workflowCount };
        } catch (error) {
            logger.error(`Error in CfaProcessModel.snowFlakeErrorLogs`, error);
            return null;
        } finally {
            if (client != null) client.release();
        }
    },
};
