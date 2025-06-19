import commonHelper from "../helper";
import logger from "../lib/logger";
import { MdmModel } from "../models/mdm.model";
import XLSX from 'xlsx'
import { mdmTransformer } from "../transformer/mdmTransformer";
import { ErrorMessage } from "../constant/error.message";
import Email from "../helper/email";
export const MdmService = {

  async mdmDownload(kams): Promise<any> {
    try {
      logger.info('Inside MdmService -> mdmDownload');
      const response = await MdmModel.downloadMdmData(kams)
      if (response?.rows?.length > 0) {
        /**const workbook = XLSX.utils.book_new();
        const worksheet = XLSX.utils.json_to_sheet(response.rows);
        XLSX.utils.book_append_sheet(workbook, worksheet, 'MySheet');
        const buffer: Buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'csv' });
        return buffer*/
        return response?.rows;
      } else {
        return null;
      }
    } catch (error) {
      logger.error('Error in downloading mdm data:', error);
      return null;
    }
  },
  async getMdmData(req) {
    return await MdmModel.getMdmData(req);
  },
  async fieldLevelSave(rowData) {
    try {
      logger.info(`Inside MdmService -> fieldLevelSave`);
      const response = await MdmModel.fieldLevelSave(rowData);
      if (response) {
        logger.info(`Mdm data saved successfully with response:`)
        return response
      } else {
        logger.info(`Mdm data saved failed with response:`)
        return null;
      }
    } catch (err) {
      logger.error(`Error in MdmService -> fieldLevelSave:`, err);
      return null;
    }
  },

  async uploadMdmData(file, updatedBy: string) {
    logger.info("inside MdmService -> uploadMdmData")
    try {
      const jsonPayload = commonHelper.convertExcelToJson(file);
      if (jsonPayload == null || Object.keys(jsonPayload).length == 0)
        return { status: false, data: null, message: ErrorMessage.MDM_DATA_UPLOAD_FAILED_WITH_CORRUPTED_FILE };
      const uploadedData = mdmTransformer.uploadMdmDataTransformer(jsonPayload);
      if (uploadedData.isInvalid) {
        return { status: false, data: uploadedData?.result, message: ErrorMessage.MDM_DATA_UPLOAD_FAILED_WITH_INVALID_DATA };
      }
      const mismatchedData = await MdmModel.validateUploadMismatch(uploadedData?.result) ?? [];
      if (mismatchedData?.length > 0) {
        return { status: false, data: mismatchedData, message: ErrorMessage.MDM_DATA_UPLOAD_FAILED_WITH_MISMATCHED_DATA };
      } else {
        const response = await MdmModel.uploadMdmData(uploadedData?.result, updatedBy);
        return { status: !(response == null), data: response };
      }
    } catch (error) {
      logger.error("CAUGHT: Error in MdmService -> uploadMdmData: ", error);
      return { status: false, data: null, message: ErrorMessage.MDM_DATA_UPLOAD_FAILED_WITH_CORRUPTED_FILE };
    }
  },

  async getAllCustomers() {
    logger.info('inside MdmService -> getAllCustomers');
    return await MdmModel.getAllCustomers();
  },
  async getMdmNotification() {
    logger.info('inside MdmService -> getMdmNotification');
    let emails = await MdmModel.getMdmNotification();
    let emailResponse: boolean = false;
    for (let data of emails) {
      if (data?.email) {
        emailResponse = await Email.mdm_notification(data.email, data.customer)
          .then((res) => {
            if (res) {
              return true;
            }
          }).catch((err) => {
            logger.error(ErrorMessage.MDM_DATA_MAIL_FAILED, err);
            return false;
          }
          );
      }
    }
    return emailResponse
  },
  async createOrUpdateMdmData(data: any) {
    try {
      logger.info('inside MdmService -> createOrUpdateMdmData');
      if(data?.body?.type == "ADD"){
        const dataValidation = await MdmModel.validateMdmData(data.body);
        if (dataValidation && dataValidation.rows.length) {
          logger.info(`Validation failed for PSKU with response:`)
          return {message: "Data With same priority exists", data: dataValidation.rows};
        }
        const response = await MdmModel.createMdmData(data);
        if (response) {
          logger.info(`New PSKU created successfully with response:`)
          return response;
        } else {
          logger.info(`New PSKU creation failed with response:`)
          return null;
        }
      }
      else if(data?.body?.type == "UNMAP"){
          const respone = await MdmModel.deleteMdmData(data);
          if (respone) {
            logger.info(`PSKU Unmapped successfully with response:`)
            return respone;
          } else {
            logger.info(`PSKU Unmapped failed with response:`)
            return null;
          }
      }
    else if(data?.body[0]?.type == "EDIT"){
      const dataValidation = await MdmModel.validateMdmData(data.body[0],data.body[1]);
      if (dataValidation && dataValidation.rows.length) {
        logger.info(`Validation failed for PSKU with response:`)
        return {message: "Data With same priority exists", data: dataValidation.rows};
      }
      const response = await MdmModel.editMdmData(data);
      if (response) {
        logger.info(`PSKU Edited successfully with response:`)
        return response;
      } else {
        logger.info(`PSKU Edited failed with response:`)
        return null;
      }
  }
}
    catch (err) {
      logger.error(`Error in MdmService -> createOrUpdateMdmData:`, err);
      return null;
    }

  }
}