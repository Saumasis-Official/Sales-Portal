import { Schema } from "redis-om"; 

// Make each as Schema Object and export it

// Appsettings Schema
const appSettings: Schema = new Schema("app-settings", {
    key: {type: 'string' },
    value: {type: 'string' }, 
}, {
    dataStructure: 'JSON'
});


const adminAppSettings: Schema = new Schema("admin-app-settings", {
	key: {type: 'string'},
    value: {type: 'string'},
    updated_by: {type: 'string'},
    remarks: {type: 'string'},
    allowed_values: {type: 'string[]'},
    field_type: {type: 'string'},
    description: {type: 'string'},
    first_name: {type: 'string'},
    last_name: {type: 'string'},
    user_id: {type: 'string'}
	
}, {
	dataStructure: 'JSON'
});


// Dashboard Distributor List Schema
const distributorList: Schema = new Schema("distributor-list", {
    id: {type: 'string' },
    up: {type: 'string' },
    mobile: {type: 'string' },
	email : {type: 'string'},
	area_code : {type: 'string'},
	city : {type: 'string'},
	status : {type: 'string'},
	postal_code : {type: 'string'},
	enable_liquidation : {type: 'boolean'},
	enable_pdp : {type: 'boolean'},
	enable_ao  : {type: 'boolean'},
	enable_reg  : {type: 'boolean'},
	enable_ro  : {type: 'boolean'},
	enable_bo  : {type: 'boolean'},
    //need to add enable_noc
	state : {type: 'string'},
	po_so_sms : {type: 'boolean'},
	tse_code : {type: 'string'},
	region : {type: 'string'},
	description : {type: 'string'},
	pdp_unlock_start : {type: 'string'},
	pdp_unlock_end : {type: 'string'},
    enable_po_so_sms : {type : 'boolean'},
    enable_po_so_email : {type : 'boolean'},
    enable_invoice_sync_sms : {type : 'boolean'},
    enable_invoice_sync_email : {type : 'boolean'},
    sms_tse_asm : {type : 'boolean'},
    email_tse_asm : {type : 'boolean'},
    enable_login : {type : 'boolean'}
}, {
    dataStructure: 'JSON'
});


export { appSettings, distributorList, adminAppSettings };