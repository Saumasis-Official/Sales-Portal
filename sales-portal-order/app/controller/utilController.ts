import reader from 'xlsx';
import { Request, Response } from 'express';
import { ErrorMessage } from '../constants/errorMessage';
import { SuccessMessage } from '../constants/successMessage';
import ResponseTemplate from '../helper/responseTemplate';
import logger from '../lib/logger';
import { utilService } from '../service/utilService';
import { LogService } from '../service/LogService';
import Email from '../helper/email';
import {GetRDDForAutoClosure} from '../interfaces/getRDDForAutoClosure';
class utilController {
  static dockingType = {
    SH: 'SHIPPING_POINT',
    Y1: 'UNLOADING_POINT',
  };

  static async migrateDistributors(filename: String) {
    logger.info(`inside utilController -> migrateDistributors`);
    try {
      if (!filename) {
        logger.info(`inside utilController -> migrateDistributors, file does not exist`);
        return ResponseTemplate.errorMessage(ErrorMessage.DISTRIBUTORS_FILE);
      }

      const path = global.__basedir + '/dist/uploads/' + filename;

      const file = reader.readFile(path);
      // const sheets = file.SheetNames

      const temp: any[] = reader.utils.sheet_to_json(file.Sheets[file.SheetNames[0]],
                                                                                    {
                                                                                      header: [
                                                                                        'id',
                                                                                        'name',
                                                                                        'city',
                                                                                        'postal_code',
                                                                                        'region_code',
                                                                                        'region_desc',
                                                                                        'group_name',
                                                                                        'group_desc',
                                                                                        'plant_name',
                                                                                        'plant_desc',
                                                                                        'region_name_code',
                                                                                        'region_name',
                                                                                        'tsc_code',
                                                                                        'mobile',
                                                                                        'email',
                                                                                        'market',
                                                                                        'status',
                                                                                      ],
                                                                                    },
                          );

      temp.shift();
      temp.shift();

     
      let distributors: any = [];
      let regions: any = [];
      let groups: any = [];
      let plants: any = [];
      let profiles: any = [];
      let distributorsWithPlants: any = [];

      for (let j = 0; j < temp.length; j++) {
        let regionRow = {
          code: temp[j].region_code ? temp[j].region_code : '',
          name_code: temp[j].region_name_code
            ? temp[j].region_name_code
            : '',
          name: temp[j].region_name ? temp[j].region_name : null,
          description: temp[j].region_desc
            ? temp[j].region_desc
            : null,
        };

        let groupRow = {
          name: temp[j].group_name ? temp[j].group_name : '',
          description: temp[j].group_desc ? temp[j].group_desc : null,
        };

        let plantRow = {
          name: temp[j].plant_name ? temp[j].plant_name : '',
          description: temp[j].plant_desc ? temp[j].plant_desc : null,
        };

        const mobileNumber = temp[j].mobile
          ? temp[j].mobile.toString().replace(/[^0-9]/g, '')
          : '';

        let profileRow = {
          id: temp[j].id,
          name: temp[j].name ? temp[j].name.replace("'", "''") : '',
          email: temp[j].email ? temp[j].email : null,
          mobile:
            mobileNumber.length <= 12 && mobileNumber.length >= 10
              ? mobileNumber
              : null,
          type: 'DISTRIBUTOR',
        };

        regions.push(regionRow);
        groups.push(groupRow);
        plants.push(plantRow);
        profiles.push(profileRow);
      }


      const filteredRegions = regions.filter(
        (v, i, a) => a.findIndex((t) => t.code === v.code) === i,
      );
      const filteredGroups = groups.filter(
        (v, i, a) => a.findIndex((t) => t.name === v.name) === i,
      );
      const filteredPlants = plants.filter(
        (v, i, a) => a.findIndex((t) => t.name === v.name) === i,
      );
      const filteredProfiles = profiles.filter(
        (v, i, a) => a.findIndex((t) => t.id === v.id) === i,
      );

      regions = JSON.stringify(filteredRegions);
      groups = JSON.stringify(filteredGroups);
      plants = JSON.stringify(filteredPlants);
      profiles = JSON.stringify(filteredProfiles);

      let regionsMapping = {};
      let groupsMapping = {};
      let plantsMapping = {};

      for (let j = 0; j < temp.length; j++) {
        let distributorRow = {
          id: temp[j].id.toString(),
          profile_id: temp[j].id,
          city: temp[j].city
            ? temp[j].city.toString().replace("'", "''")
            : null,
          postal_code: temp[j].postal_code
            ? temp[j].postal_code
            : null,
          region_id: temp[j].region_code
            ? regionsMapping[temp[j].region_code]
              ? regionsMapping[temp[j].region_code]
              : null
            : null,
          group_id: temp[j].group_name
            ? groupsMapping[temp[j].group_name]
              ? groupsMapping[temp[j].group_name]
              : null
            : null,
          tse_code: temp[j].tse_code ? temp[j].tse_code : null,
          // pdp_day: temp[j].pdp_day ? temp[j].pdp_day : null,
          market: temp[j].market
            ? temp[j].market.toString().replace("'", "''")
            : null,
        };

        distributors.push(distributorRow);
      }

      const filteredDistributors = distributors.filter(
        (v, i, a) => a.findIndex((t) => t.id === v.id) === i,
      );


      const filteredDistributorsWithPlants = temp.filter(
        (v, i, a) =>
          a.findIndex(
            (t) => t.id === v.id && t.plant_name === v.plant_name,
          ) === i,
      );
      

      for (let distributor of filteredDistributorsWithPlants) {
        if (distributor.plant_name) {
          const distributorHasPlantsRow = {
            distributor_id: distributor.id.toString(),
            plant_id: plantsMapping[distributor.plant_name]
              ? plantsMapping[distributor.plant_name]
              : 0,
          };
          distributorsWithPlants.push(distributorHasPlantsRow);
        }
      }

      distributors = JSON.stringify(filteredDistributors);
      distributorsWithPlants = JSON.stringify(distributorsWithPlants);

      const insertDistributorsResponse = await utilService.insertDistributors(distributors);
      const insertDistributorsHasPlantsResponse = await utilService.insertDistributorPlants(distributorsWithPlants);

      if(insertDistributorsResponse && insertDistributorsHasPlantsResponse) {
        return ResponseTemplate.successMessage(SuccessMessage.DISTRIBUTOR_MIGRATION);
      }else{
        return ResponseTemplate.errorMessage(ErrorMessage.DISTRIBUTOR_MIGRATION);
      }
      
    } catch (error) {
      logger.error(`inside utilController -> migrateDistributors, Error:`, JSON.stringify(error) );
      return ResponseTemplate.internalServerError();
    }
  }

  static async migrateWarehouseDetails(filename: String) {
    try {
      if (!filename) {
        logger.info(`inside utilController -> migrateWarehouseDetails, file does not exist`);
        return ResponseTemplate.errorMessage(ErrorMessage.WAREHOUSE_DETAILS_FILE);
      }

      const path = global.__basedir + '/dist/uploads/' + filename;

      const file = reader.readFile(path);

      // const sheets = file.SheetNames

      const temp: any[] = reader.utils.sheet_to_json(
        file.Sheets[file.SheetNames[1]],
        {
          header: [
            'customer',
            's_org',
            'd_chl',
            'dv',
            'partner_function',
            'partner_code',
            'name',
          ],
        },
      );

      let insertWarehouseDetailsResponse:boolean = true;
      for (let j = 2; j < temp.length; j++) {

        let warehouseDetailsRow: any = {
          distributor_id: temp[j].customer
            ? temp[j].customer.toString()
            : '0',
          sales_org: temp[j].s_org ? temp[j].s_org : 0,
          distrbution_channel: temp[j].d_chl ? temp[j].d_chl : 0,
          division: temp[j].dv ? temp[j].dv : 0,
          type: this.dockingType[temp[j].partner_function]
            ? this.dockingType[temp[j].partner_function]
            : '',
          partner_name: temp[j].name
            ? temp[j].name.replace("'", "''")
            : '',
          partner_code: temp[j].partner_code
            ? temp[j].partner_code
            : '',
        };
        warehouseDetailsRow = JSON.stringify(warehouseDetailsRow);
        
        const response =  await utilService.insertWarehouseDetails(warehouseDetailsRow);
        if(!response)
          insertWarehouseDetailsResponse = false;
      }
      if(insertWarehouseDetailsResponse) {
        return ResponseTemplate.successMessage(SuccessMessage.WAREHOUSE_DETAILS_MIGRATION);
      }else{
        return ResponseTemplate.errorMessage(ErrorMessage.WAREHOUSE_DETAILS_MIGRATION);
      }
    } catch (error) {
      logger.error(`inside utilController -> migrateWarehouseDetails, Error:`, JSON.stringify(error) );
      return ResponseTemplate.internalServerError();
    }
  }

  static async migrateSalesHierarchy(filename: String) {
    logger.info(`inside utilController -> migrateSalesHierarchy`);
    try {
      if (!filename) {
        logger.info(`inside utilController -> migrateSalesHierarchy, file does not exist`);
        return ResponseTemplate.errorMessage(ErrorMessage.SALES_HIERARCHY_FILE);
      }

      const path = global.__basedir + '/dist/uploads/' + filename;
      const file = reader.readFile(path);
      let temp: any[] = reader.utils.sheet_to_json(file.Sheets[file.SheetNames[2]],
                                                                                  {
                                                                                    header: [
                                                                                      'l1_code',
                                                                                      'l1_name',
                                                                                      'l2_code',
                                                                                      'l2_name',
                                                                                      'l3_code',
                                                                                      'l3_name',
                                                                                      'l4_code',
                                                                                      'l4_name',
                                                                                      'l5_code',
                                                                                      'l5_name',
                                                                                      'l6_code',
                                                                                      'l6_name',
                                                                                    ],
                                                                                  },
                        );

      temp.shift();

      const insertSalesHierarchyResponse = await utilService.insertSalesHierarchy(temp);

      if(insertSalesHierarchyResponse) {
        return ResponseTemplate.successMessage(SuccessMessage.SALES_HIERARCHY_MIGRATION);
      }else{
        return ResponseTemplate.errorMessage(ErrorMessage.SALES_HIERARCHY_MIGRATION);
      }
      
    } catch (error) {
      logger.error(`inside utilController -> migrateSalesHierarchy, Error:`, JSON.stringify(error) );
      return ResponseTemplate.internalServerError();
    }
  }

  static async migrateMaterials(filename: String) {
    logger.info(`inside utilController -> migrateMaterials`);
    try {
      if (!filename) {
        logger.info(`inside utilController -> migrateMaterials, file does not exist`);
        return ResponseTemplate.errorMessage(ErrorMessage.MATERIALS_FILE);
      }

      const path = global.__basedir + '/dist/uploads/' + filename;
   

      const file = reader.readFile(path);

      const temp: any[] = reader.utils.sheet_to_json(
        file.Sheets[file.SheetNames[3]],
        {
          header: [
            'material',
            'description',
            'sales_unit',
            'pack_code',
            'pack_type',
            'status',
          ],
        },
      );


      let materials: any = [];

      for (let j = 1; j < temp.length; j++) {
        
        let materialRow = {
          code: temp[j].material ? temp[j].material : 0,
          description: temp[j].description
            ? temp[j].description.replace("'", "''")
            : '',
          sales_unit: temp[j].sales_unit ? temp[j].sales_unit : '',
          pak_code: temp[j].pack_code ? temp[j].pack_code : '',
          pak_type: temp[j].pack_type ? temp[j].pack_type : '',
        };

        materials.push(materialRow);
      }
    
      const insertMaterialsResponse = await utilService.insertMaterials(JSON.stringify(materials));

      if(insertMaterialsResponse) {
        return ResponseTemplate.successMessage(SuccessMessage.MATERIALS_MIGRATION);
      }else{
        return ResponseTemplate.errorMessage(ErrorMessage.MATERIALS_MIGRATION);
      }
    } catch (error) {
      logger.error(`inside utilController -> migrateMaterials, Error:`, JSON.stringify(error) );
      return ResponseTemplate.internalServerError();
    }
  }

  static async migrateMaterialsFromNewExcel(filename: String) {
    logger.info(`inside utilController -> migrateMaterialsFromNewExcel`);
    try {
      if (!filename) {
        logger.info(`inside utilController -> migrateMaterialsFromNewExcel, file does not exist`);
        return ResponseTemplate.errorMessage(ErrorMessage.MATERIALS_FILE);
      }

      const path = global.__basedir + '/dist/uploads/' + filename;

      const file = reader.readFile(path);

      const temp: any[] = reader.utils.sheet_to_json(
        file.Sheets[file.SheetNames[0]],
        {
          header: [
            'material',
            'description',
            'sales_unit',
            'pack_code',
            'pack_type',
            'status',
          ],
        },
      );

      let materials: any = [];

      for (let j = 1; j < temp.length; j++) {
      
        let materialRow = {
          code: temp[j].material ? temp[j].material : 0,
          description: temp[j].description
            ? temp[j].description.replace("'", "''").split('_').join(' ')
            : '',
          sales_unit: temp[j].sales_unit ? temp[j].sales_unit : '',
          pak_code: temp[j].pack_code ? temp[j].pack_code : '',
          pak_type: temp[j].pack_type ? temp[j].pack_type : '',
        };

        materials.push(materialRow);
      }


      const truncateResponse = await utilService.truncateMaterialMaster();
      if(!truncateResponse){
        return ResponseTemplate.errorMessage(ErrorMessage.MATERIALS_MIGRATION);
      }

      const insertMaterialsResponse = await utilService.insertMaterials(JSON.stringify(materials));

     if(insertMaterialsResponse) {
        return ResponseTemplate.successMessage(SuccessMessage.MATERIALS_MIGRATION);
      }else{
        return ResponseTemplate.errorMessage(ErrorMessage.MATERIALS_MIGRATION);
      }
    } catch (error) {
      logger.error(`inside utilController -> migrateMaterialsFromNewExcel, Error:`, JSON.stringify(error) );
      return ResponseTemplate.internalServerError();
    }
  }

  static async updateMaterialTags(filename: string) {
    try {
      if (!filename) {
        return { success: false, message: 'File does not exist!' };
      }

      // HOTFIX : SOPE-1532 Material Tags sync not picking up the file from the correct path
      const path = filename;
      const file = reader.readFile(path);
      const headers = this.getHeaderRow(file.Sheets[file.SheetNames[0]]);
      const range = reader.utils.decode_range(file.Sheets[file.SheetNames[0]]['!ref']);
      const ncols = range.e.c - range.s.c + 1;

      if ((JSON.stringify(headers) !== JSON.stringify([
        'Material',
        'Description',
        'Pack Measure Tags',
        'Regional Brand Tags',
        'General Tags',
        'Pack Type Tags'
      ])) || (ncols !== 6)) {
        return { success: false, message: 'The uploaded file is not as per the supported file template. Please upload the file with columns in the following sequence: Material, Description, Pack Measure Tags, Regional Brand Tags, General Tags, Pack Type Tags.' };
      }

      const temp: {
        material: string, description: string, sales_unit: any, pack_measure_tags: any, regional_brand_tags: any, general_tags: any, pack_type_tags: any
      }[] = reader.utils.sheet_to_json(
        file.Sheets[file.SheetNames[0]],
        {
          header: [
            'material', 'description', 'pack_measure_tags', 'regional_brand_tags', 'general_tags', 'pack_type_tags',
          ],
        },
      );

      logger.info(`TEMP LENGTH: ${temp.length}`);

      const updateMaterialTagsResponse = await utilService.updateMaterialTags(temp);

      if (updateMaterialTagsResponse && !isNaN(updateMaterialTagsResponse)) {
        LogService.insertSyncLog('MATERIAL_TAGS', 'SUCCESS', { upsertCount: updateMaterialTagsResponse, deleteCount: null });
        return ResponseTemplate.success({ updateCount: updateMaterialTagsResponse }, SuccessMessage.UPDATE_MATERIAL_TAGS_SUCCESS);
      }
      LogService.insertSyncLog('MATERIAL_TAGS', 'FAIL', null, null, 'updateMaterialTagResponse is empty or not a number');
      return ResponseTemplate.error(ErrorMessage.UPDATE_MATERIAL_TAGS_ERROR);
    } catch (error) {
      logger.error(`error in migrateMaterials: `, error);
      LogService.insertSyncLog('MATERIAL_TAGS', 'FAIL', null, null, `error in update material tags: ${error}`);
      return ResponseTemplate.internalServerError();
    }
  }

  static async updateSalesHierarchyDetails(filename: String) {
    try {
      if (!filename) {
        return { success: false, message: 'File does not exist!' };
      }

      const path = global.__basedir + '/dist/uploads/' + filename;

      const file = reader.readFile(path);

      const temp = reader.utils.sheet_to_json(file.Sheets[file.SheetNames[0]],
        {
          header: [
            'user_id', 'first_name', 'last_name', 'email', 'mobile_number', 'manager_id', 'code',
          ],
        },
      );

      logger.info(`TEMP LENGTH: ${temp.length}`);

      const updateSalesHierarchyDetailsResponse = await utilService.updateSalesHierarchyDetails(temp);

      if (updateSalesHierarchyDetailsResponse && !isNaN(updateSalesHierarchyDetailsResponse)) {
        return ResponseTemplate.success({ updateCount: updateSalesHierarchyDetailsResponse }, SuccessMessage.UPSERT_SALES_HIERARCHY_DETAILS_SUCCESS);
      }
      return ResponseTemplate.error(ErrorMessage.UPSERT_SALES_HIERARCHY_DETAILS_ERROR);
    } catch (error) {
      logger.error(`error in migrateMaterials: `, JSON.stringify(error));
      return ResponseTemplate.internalServerError();
    }
  }

  static async getSyncLogs(req: Request, res: Response) {
    try {
      const responseData: any = await utilService.getSyncLogs();

      if (responseData && responseData.length) {
        return res.json(ResponseTemplate.success(responseData, SuccessMessage.SYNC_LOGS));
      }
      return res.status(500).json(ResponseTemplate.error(ErrorMessage.SYNC_LOGS_FETCHED_ERROR));
    } catch (error) {
      logger.error('error in getSyncLogs: ', error);
      return res.status(500).json(ResponseTemplate.error(ErrorMessage.SYNC_LOGS_ERROR, JSON.stringify(error)));
    }
  }

  static async getMaterialsTag(req: Request, res: Response) {
    try {
      logger.info('inside getMaterilasTag controller')
      const responseData: any = await utilService.getMaterialsTag();

      if (responseData) {
        return res.json(ResponseTemplate.success(responseData, SuccessMessage.MATERIALS_TAG));
      }
    } catch (error) {
      logger.error('error in getMaterialsTag: ', error);
      res.status(500).json(ResponseTemplate.error(ErrorMessage.MATERIALS_TAG_ERROR, JSON.stringify(error)));
    }
  }

  static async rushOrderResponseStatus(req: Request, res: Response) { 

    try {
      const body = req.body;
     await  Email.rushOrderResponseNotification(body);

    } catch (error) {

    }

  }
  static getHeaderRow(sheet) {
    var headers = [];
    var range = reader.utils.decode_range(sheet['!ref']);
    var C, R = range.s.r; /* start in the first row */
    /* walk every column in the range */
    for (C = range.s.c; C <= range.e.c; ++C) {
      var cell = sheet[reader.utils.encode_cell({ c: C, r: R })] /* find the cell in the first row */

      var hdr = "UNKNOWN " + C; // <-- replace with your desired default 
      if (cell && cell.t) hdr = reader.utils.format_cell(cell);

      headers.push(hdr);
    }
    return headers;
  }

  static async getRDDForAutoClosure(req: Request, res: Response) {
    logger.info("inside UtilController -> getRDDForAutoClosure");
    try {
      const { body } = req;
      const response: GetRDDForAutoClosure[] = await utilService.getRDDForAutoClosure(body);
      //null response should not be returned. please return empty array instead
      return res.status(200).json(ResponseTemplate.success(response, ""));
    } catch (error) {
      logger.error("CAUGHT: Error in UtilController -> getRDDForAutoClosure", error);
      return res.status(200).json(ResponseTemplate.success([], ""));
    }
  }

}

export default utilController;
