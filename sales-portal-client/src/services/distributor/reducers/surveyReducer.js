import Immutable from 'immutable';
import  {SURVEY_UPDATE_DEPOT_CODE, SURVEY_UPDATE_TABLE,CUSTOMER_CODES} from '../actions/surveyActionTypes';
const survey_data = Immutable.Map({
    loading: false,
    depot_code:{},
    date:[],
    questions:[],
    customer_codes:[]
});


function surveyReducer(survey = survey_data, action) {
    switch (action.type) {
        case SURVEY_UPDATE_DEPOT_CODE:
            return survey.set('depot_code', action.payload.depo_code)
                         .set('loading', action.payload.status)  
                         .set('date', action.payload.date)  
                         .set('questions', action.payload.questions)
                                default: return survey;
        case CUSTOMER_CODES:
            return survey.set('customer_codes', action.payload)

    }
}


export default surveyReducer;