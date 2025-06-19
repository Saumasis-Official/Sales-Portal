import {SURVEY_UPDATE_DEPOT_CODE,CUSTOMER_CODES} from './surveyActionTypes';
export const survey_update_config =(data)=>{
  return {
    type:SURVEY_UPDATE_DEPOT_CODE,
    payload:data
  }
}
export const customer_codes =(data)=>{
  return {
    type:CUSTOMER_CODES,
    payload:data
  }
}
export const updateCustomerCodes =(data)=>{
  return (dispatch)=>{
    dispatch(customer_codes(data));
  }}

export const  update_survey =(data)=>{
    return (dispatch)=>{
        dispatch(survey_update_config(data));
    }
}



