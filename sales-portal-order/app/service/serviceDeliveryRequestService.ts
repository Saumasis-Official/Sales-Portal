import Helper from "../helper";
import Email from "../helper/email";
import logger from "../lib/logger";
import emailConfig from '../config/email';
const mailConfig = global['configuration'].email;
import { ServiceDeliveryRequestModel } from "../models/serviceDeliveryRequestModel"
export const ServiceDeliveryRequestService = {



    async addSDRequest(serviceDeliveryRequestData: any, user: any) {
        logger.info('inside ServiceDeliveryRequestService addSDRequest');
        return await ServiceDeliveryRequestModel.addSDRequest(serviceDeliveryRequestData, user);
    },

    async updateSDRequest(serviceDeliveryRequestData: any, user: any) {
        logger.info('inside ServiceDeliveryRequestService updateSDRequest');
        return await ServiceDeliveryRequestModel.updateSDRequest(serviceDeliveryRequestData, user);
    },

    async getSDList(roles: string[], userId: string, limit: number, offset: number, search: string, userEmail: string, status: string, code: string) {
        logger.info('inside ServiceDeliveryRequestService -> getSDList');
        return await ServiceDeliveryRequestModel.getSDList(roles, userId, limit, offset, search, userEmail, status,code);
    },

    async sdrReport(to: string, from: string) {
        logger.info('inside ServiceDeliveryRequestService -> sdrReport');
        return await ServiceDeliveryRequestModel.sdrReport(to, from);
    },

    async sdResponseReport(to: string, from: string) {
        logger.info('inside ServiceDeliveryRequestService -> sdResponseReport');
        return await ServiceDeliveryRequestModel.sdResponseReport(to, from);
    },

    async getSDListCount(roles: string[], userId: string, search: string, userEmail: string, status: string, code: string) {
        logger.info('inside ServiceDeliveryRequestService -> getSDListCount');
        return await ServiceDeliveryRequestModel.getSDListCount(roles, userId, search, userEmail, status, code);
    },
    async fetchReportsForAllRegions() {
        logger.info('inside ServiceDeliveryRequestService -> fetchReportsForAllRegions');
        try {
          const regions = await ServiceDeliveryRequestModel.getAllRegions();
          if (!regions) {
            logger.error('No regions found');
            return;
          }
      
          let overallReportData = [];
          let overallExcelData = [];
          const uniqueReportRows = new Set();
      
          for (const region of regions) {
            logger.info(`Processing data for region: ${region}`);
      
            const report = await ServiceDeliveryRequestModel.getSDReport(region);
            const excel = await ServiceDeliveryRequestModel.getSDExcelData(region);
      
            let summary = null;
            let fileDetails = null;
            if (report) {
              summary = report
                .filter(row => 
                  Number(row.raised_tickets) !== 0 || 
                  Number(row.responded_tickets) !== 0 || 
                  Number(row.open_tickets) !== 0
                )
                .map(row => ({
                  region: row.region,
                  raisedTickets: Number(row.raised_tickets),
                  respondedTickets: Number(row.responded_tickets),
                  openTickets: Number(row.open_tickets),
                }));
            }
      
            if (excel && excel.length > 0) {
              fileDetails = Helper.createXlsxFile([excel], ['sd_report'], `sd_report_${region}`, true);
            } else {
              fileDetails = null;
            }
      
            const { toEmails, ccEmails } = await ServiceDeliveryRequestModel.getEmailsForSDReport(region);
            await Email.sdReportByRegion(region, fileDetails, summary, toEmails, ccEmails);
      
            if (report) {
              report.forEach(row => {
                const rowKey = `${row.region}-${row.raised_tickets}-${row.responded_tickets}-${row.open_tickets}`;
                if (!uniqueReportRows.has(rowKey)) {
                  uniqueReportRows.add(rowKey);
                  overallReportData.push(row);
                }
              });
            }
            if (excel) {
              overallExcelData = overallExcelData.concat(excel);
            }
          }
      
          if (overallReportData.length > 0 || overallExcelData.length > 0) {
            const summary = overallReportData
              .filter(row => 
                Number(row.raised_tickets) !== 0 || 
                Number(row.responded_tickets) !== 0 || 
                Number(row.open_tickets) !== 0
              )
              .map(row => ({
                region: row.region,
                raisedTickets: Number(row.raised_tickets),  
                respondedTickets: Number(row.responded_tickets),  
                openTickets: Number(row.open_tickets),  
              }));
            // Sort the summary by region in alphabetical order
            summary.sort((a, b) => a.region.localeCompare(b.region));
      
            const totalSummary = {
              region: 'Total',
              raisedTickets: summary.reduce((sum, row) => sum + row.raisedTickets, 0),
              respondedTickets: summary.reduce((sum, row) => sum + row.respondedTickets, 0),
              openTickets: summary.reduce((sum, row) => sum + row.openTickets, 0),
            };
            summary.push(totalSummary);
      
            let fileDetails = null;
            if (overallExcelData.length > 0) {
              fileDetails = Helper.createXlsxFile([overallExcelData], ['sd_report'], 'sd_report_all_regions', true);
            }
      
            const { to: toEmail } = emailConfig.sd_report_email;
            await Email.sdReportByRegion('all Regions', fileDetails, summary, toEmail, '');
          }
        } catch (error) {
          logger.error('Error in ServiceDeliveryRequestService -> fetchReportsForAllRegions', error);
        }
      }
}

