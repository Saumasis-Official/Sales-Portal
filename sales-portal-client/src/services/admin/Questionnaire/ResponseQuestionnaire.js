import { React, useEffect, useState } from 'react';
import './survey.css';
import * as AuthAction from '../../auth/action';
import { connect } from 'react-redux';
import Auth from '../../../util/middleware/auth';
import {
  Select,
  Option,
  Space,
  DatePicker,
  Tooltip,
  Modal,
  Button,
  notification,
} from 'antd';
import * as Action from '../../distributor/actions/dashboardAction';
import moment from 'moment';
import Loader from '../../../components/Loader';

function ResponseQuestionnaire(props) {
  const {
    get_cfa_questions,
    getRegionDetails,
    survey_db_response,
    region_details
  } = props;

  const { distributor_sales_details, id, name, email, mobile } = region_details;
  const [depot, setDepotCode] = useState();
  const [questionList, setQuestionList] = useState([]);
  const [dbDetails, setDbDetails] = useState();
  const [dbComment, setDbComment] = useState('');
  const [currentDepot, setCurrentDepot] = useState();
  const [startSurvey, setStartSurvey] = useState();
  const [endSurvey, setEndSurvey] = useState();
  const [submitflag, setsubmitflag] = useState(false);
  const [commentflag, setcommentflag] = useState(false);
  const [db_response, setDb_response] = useState(false);
  const [defaultSelect, setdefaultSelect] = useState();
  const [plantName, setPlantName] = useState();
  const [displayPlantName, setDisplayPlantName] = useState();
  const [distributorDepot, setDistributorDepot] = useState(null);
  const [selectedDepot, setSelectedDepot] = useState(null);
  const [depotLocation, setDepotLocation] = useState("");
  const now = new Date();
  const { Option } = Select;
  function RatingsComponent({
    defaultValue,
    ratingUpdate,
    qno,
    rating,
  }) {
    let result = questionList
      .map((data, i) => (data.ratings === 0 ? false : true))
      .every((item) => item === true);

    if (result) {
      setsubmitflag(true);

    } else {
      setsubmitflag(false);
    }
    let number = new Array(Number(defaultValue))
      .fill(0)
      .map((_, i) => i + 1);

    function tdtrack(i) {
      ratingUpdate(qno, i);
    }
    return (
      <>
        {number.map((data, i) =>
          rating === i + 1 ? (
            <td className="width4">
              <div class="checkbox-wrapper-18">
                <div class="round">
                  <input type="checkbox" id="checkbox-18" checked />
                  <label for="checkbox-18"></label>
                </div>
              </div>
            </td>
          ) : (
            <td onClick={() => tdtrack(i)} className="width4"></td>
          ),
        )}
      </>
    );
  }

 async function fetchUserDetails(){

 let userDetails = await getRegionDetails()

 return userDetails

  }

  useEffect(() => {
  
    fetchUserDetails().then(res=>{
      let {id,name,email,mobile}= res

      let plantNames = [];
      let depots = res.distributor_sales_details
        ?.map((data) => data.plant_name)
        .reduce(function (acc, curr) {
          if (!acc.includes(curr)) acc.push(curr);
          return acc;
        }, []);
        

      res.distributor_sales_details?.forEach((item) => {
        if (depots.includes(item.plant_name)) {
          plantNames.push({
            depocode: item.plant_name,
            plantname: item.plant_description,
          });
        }
      });
      setPlantName(plantNames);
  
      setDistributorDepot(depots)
      setDbDetails({
        db_code: id,
        db_name: name,
        db_email: email,
        db_mobile: mobile,
        depot_code: depots,
      });
 

if(depots!=null){
      setDepotCode(depots!=null?depots:distributorDepot);
      // setDisplayPlantName(plantName[0].plantname);
      getAllCfaQuestions(depots, id,plantNames);

      setSelectedDepot(depots!=null?depots[0]:null)
      setCurrentDepot(depots!=null?depots:depots[0]);
}
    })

    }, []);

  function getAllCfaQuestions(plantCode, dbCode,plantName) {
   
    if(plantCode!=null && dbCode!=null) {
    get_cfa_questions({ depot_code: [...plantCode] }).then((res) => {
     
      let plantcode = [];
      if (res.success) {
        let result = res.data?.filter(i => i.depot_code != "");

        result?.forEach((item) => {
          if (item.dbs_responded.includes(dbCode)) {
            plantcode.push({
              label: item.depot_code,
              value: item.depot_code,
              disabled: true,
              message: 'Response already submitted',
            });
          }
          else if(!item.applicable_distributors.includes(dbCode)){
                plantcode.push({
                label: item.depot_code,
                value: item.depot_code,
                disabled: true,
                message: 'Survey is not active',
              });
          }
      
          else if (
            (!moment(now).isBetween(item.survey_start, item.survey_end) ) 
          ) {
            plantcode.push({
              label: item.depot_code,
              value: item.depot_code,
              disabled: true,
              message: 'Survey is not active',
            });
          }
              else {
            plantcode.push({
              label: item.depot_code,
              value: item.depot_code,
              disabled: false,
              message: '',
            });
          }
        });

        setDepotCode(plantcode);
        const defaultValue = plantcode?.map((data) =>
          !data.disabled ? data.value : undefined,
        );
        const filtereDefaultdArray = [];

        for (const element of defaultValue) {
          if (element !== undefined) {
            filtereDefaultdArray.push(element);
          }
        }
        handleChanges(filtereDefaultdArray[0]);
        setdefaultSelect([filtereDefaultdArray[0]]);
        setDisplayPlantName(plantName?.find((item) => item.depocode === filtereDefaultdArray[0])?.plantname);
        setDepotLocation(res?.data?.find(d => d.depot_code === filtereDefaultdArray[0])?.location ?? "")
        get_CFA_Questions(filtereDefaultdArray[0], dbCode);
      } else {
        plantCode.forEach((item) => {
          plantcode.push({
            label: item,
            value: item,
            disabled: true,
            message: 'Survey is not active!',
          });
        });
        setDepotCode(plantcode);
      }
    });
  }
  }

  function get_CFA_Questions(depot_code, dbCode = '') {
    if (depot_code !== undefined) {
      get_cfa_questions({ depot_code: [depot_code] }).then((res) => {
        if (res?.success) {
          const filteredRes = res.data?.filter(i => i.depot_code != "");
          let result = [];

          setStartSurvey(
            moment(filteredRes[0].survey_start).format('YYYY-MM-DD'),
          );
          setEndSurvey(
            moment(filteredRes[0].survey_end).format('YYYY-MM-DD'),
          );

          setDepotLocation(filteredRes?.find(d => d.depot_code === depot_code)?.location ?? "")

          if(filteredRes[0].dbs_responded.includes(dbCode)){
            setDb_response(true);
            setsubmitflag(false);
            notification.success({
              message: 'Response Already Submitted',
              description: '',
              duration: 10,
              className: 'notification-green',
            });
          }

          Object.values(filteredRes[0].questions).map((data, i) => {
            result.push({
              question: data,
              ratings: 0,
              qid: filteredRes[0].id,
            });
          });

          setQuestionList(result);
        } else {
          setQuestionList([]);
        }
      });
    } else {
      setQuestionList([]);
    }
  }

  async function handleChanges(depot_code) {
    setSelectedDepot(depot_code)
    plantName?.forEach((item) => {
      if (item.depocode === depot_code) {
        setDisplayPlantName(item.plantname);
      }
    });

    setDbComment('');
    setsubmitflag(false);

   setcommentflag(false);
   setDb_response(false);
    if (depot_code !== undefined) {
      get_CFA_Questions(depot_code, dbDetails?.db_code);
    } else {
      setQuestionList([]);
    }
  }
  function ratingUpdate(qno, i) {
    let result = [...questionList];
    result[qno].ratings = i + 1;
    setQuestionList(result);
  }
  function handleInputChange(e) {
    setDbComment(e.target.value);
    if(e.target.value.length>0){
      setcommentflag(true);
    }
    else {
      setcommentflag(false);
    }
  }
  function submitResponse() {
    let obj = {};
    questionList?.forEach((item, i) => {
      obj[`q${i + 1}`] = item.question;
      obj[`a${i + 1}`] = item.ratings;
    });

    obj.comment = dbComment;
    let body = {
      questionnaire_id: questionList[0].qid,
      db_code: dbDetails.db_code,
      db_name: dbDetails.db_name,
      db_email: dbDetails.db_email,
      db_mobile: dbDetails.db_mobile,
      survey_start: startSurvey,
      survey_end: endSurvey,
      depot_code: selectedDepot,
      db_response: obj,
    };

    survey_db_response(body).then((res) => {
      if (res?.success) {
        setDb_response(false);
        setsubmitflag(false);
        setcommentflag(false);
        notification.success({
          message: 'Response submitted successfully',
          description: '',
          duration: 10,
          className: 'notification-green',
        });
      } else {
        notification.error({
          message: 'Something went wrong',
          description: '',
          duration: 10,
          className: 'notification-error',
        });
      }
    });
  }

  return (
    <div className="admin-dashboard-wrapper">
      <div className="admin-dashboard-block">
        <h1>CFA Customer Satisfaction Survey</h1>

        <div className="heading-depot-code">
          <div style={{ display: 'flex', flex: '0 0 65%' }}>
            <span className="heading-title">Select Depot Code</span>

            <Space>
              {defaultSelect && (
                <Select
                  showSearch
                  className="response-search"
                  placeholder="Select Depot Code"
                  onChange={(value) => handleChanges(value)}
                  {...(defaultSelect && {
                    defaultValue: defaultSelect,
                  })}
                >
                  {depot?.map((data) => {
                    return data.disabled ? (
                      <Option
                        value={data.value}
                        disabled={data.disabled}
                      >
                        <Tooltip title={data.message}>
                          {data.value}
                        </Tooltip>
                      </Option>
                    ) : (
                      <Option
                        value={data.value}
                        disabled={data.disabled}
                      >
                        {data.value}
                      </Option>
                    );
                  })}
                </Select>
              )}
            </Space>
            <div 
               className='response-question-select'
            >    
              <span className='flex'>Name: {[displayPlantName]} </span>
              {depotLocation && <span className='flex'>Location: {depotLocation}</span>} 
            </div>
          </div>
        </div>
        {questionList.length > 0 ? (
          <Loader>
            <div className="admin-dashboard-table">
              <div className='survey-disclaimer'><b className='mandatory-mark'> * Rating 1 is lowest and 10 is highest</b></div>
              <table className="antd-table survey-table">
                <thead>
                  <tr>
                    <th colSpan={2}>
                      Kindly Assess Your Satisfaction With Regard To The Following
                    </th>
                    <th colSpan={10}>Ratings</th>
                  </tr>
                  <tr>
                    <th id="th2">Sr No</th>
                    <th  style={{alignContent:'center'}}>Questions</th>
                    <th>1</th>
                    <th>2</th>
                    <th>3</th>
                    <th>4</th>
                    <th>5</th>
                    <th>6</th>
                    <th>7</th>
                    <th>8</th>
                    <th>9</th>
                    <th>10</th>
                  </tr>
                </thead>
                <tbody> 
                  {questionList.map((data, i) => (
                    <tr className="target"> 
                      <td>{i + 1}</td>
                      <td className="width60" style={{textAlign:'left'}} >{data.question}</td>
                      <RatingsComponent
                        defaultValue={'10'}
                        ratingUpdate={ratingUpdate}
                        qno={i}
                        rating={data.ratings}
                      />
                    </tr>
                  ))}
                </tbody> 
              </table>
              <span className="feedbackquote">
                What should we change in order to live up your
                expectation?
              </span>
            </div>
            <input
              type="text"
              className="input-feedback "
              value={dbComment}
              placeholder=" Give your feedback"
              onChange={(e) => handleInputChange(e)}
            />

            <div className="submitresponseButton">
              <button
                className="responseButton "
                onClick={() => submitResponse()}
                disabled={
                  submitflag ===false ? true : false
                  || db_response===true ? true : false
                  || commentflag===false ? true : false
                }
              >
                Submit
              </button>
            </div>
          </Loader>
        ) : (
          <Loader>
            {' '}
            <span className="feedbackquote notactive">
              Survey not active
            </span>{' '}
          </Loader>
        )}
      </div>
    </div>
  );
}

const mapStateToProps = (state) => {
  return {
    region_details: state.dashboard.get('region_details'),
  }
};

const mapDispatchToProps = (dispatch) => {
  return {
    get_depot_code: (logistics_email) =>
      dispatch(AuthAction.get_Depot_Code(logistics_email)),
    get_cfa_questions: (depot_code) =>
      dispatch(AuthAction.get_cfa_questions(depot_code)),
    getRegionDetails: (id) => dispatch(Action.getRegionDetails(id)),
    survey_db_response: (data) =>
      dispatch(AuthAction.survey_db_response(data)),
  };
};

const QuestionnaireAnswer = connect(
  mapStateToProps,
  mapDispatchToProps,
)(ResponseQuestionnaire);

export default QuestionnaireAnswer;
