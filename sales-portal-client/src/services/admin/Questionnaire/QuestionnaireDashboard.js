

import './survey.css';
import { useEffect, useState } from 'react';
import QuestionnaireReport from './SurveyReport';
import TableContents from './Tablecontent';
import QuestionModalPage from './QuestionModal';
import { hasEditPermission, pages, features } from '../../../persona/distributorHeader';
import {
  Steps,
} from 'antd'
import SurveyLink from './SurveyLink';
const {Step}=Steps
let QuestionnaireDashboard = (props) => {
  const [tabName, setTabName] = useState('SURVEY');
  const [current, setCurrent] = useState(0);
  const [depot, setDepot] = useState();
  const [question, setQuestion] = useState();
  const tabFunction = (value) => {
    setTabName(value);
  };


  const DepoSelection =()=>{
    return (
      <QuestionModalPage
      depot={depot}
      prev={prev}
      question={question}
      // depot_code={depot?.map((item) => item.value)}
      // onChangesDate={onChangesDate}
      // setOpenBox={setOpenBox}
      // allDepotDBDetails={allDepotDBDetails}
      // applicableDistributors={details?.applicable_distributors}
    />
    )
      }

  const next = (depo,questionList) => {
   
    setDepot(depo)
    setQuestion(questionList)
    setCurrent(current + 1);
  };

  const prev = () => {
    setCurrent(current - 1);
  };


  const steps = [
    {
      title: 'First',
      content: <TableContents next={next} />,
    },
    {
      title: 'Second',
      content: <DepoSelection />,
    },
  ];


  
  const items = steps.map((item) => ({
    key: item.title,
    title: item.title,
  }));

  return (
    <div className="admin-dashboard-wrapper">
      <div className="admin-dashboard-block">
      <div className='page-title-survey'>
          
          {tabName === 'SURVEY' && <h2>CFA Customer Satisfaction Survey</h2>}
          {tabName === 'REPORT' && <h2>CFA Survey Reports</h2>}
          {tabName === 'SURVEY LINK' && <h2>SURVEY LINK</h2>}
        </div> 
  
        <div className="dashboard-head mt10">
    
          <div className="dashboard-tabs"  >
            <button
              className={
                tabName === 'SURVEY' ? `tablink active` : 'tablink'
              }
              onClick={() => tabFunction('SURVEY')}
            >
              <span>Survey</span>
            </button>
            <button
              className={
                tabName === 'REPORT' ? `tablink active` : 'tablink'
              }
              onClick={() => tabFunction('REPORT')}
            >
              <span>Report</span>
            </button>
            <button
              className={
                tabName === 'SURVEY LINK' ? `tablink active` : 'tablink'
              }
              hidden={!hasEditPermission(pages.CFA_SURVEY, features.EDIT_ADMIN_SURVEY)}
              onClick={() => tabFunction('SURVEY LINK')}
            >
              <span>Admin Survey Link</span>
            </button>
          </div>
        </div>

   {tabName!=='REPORT' && tabName!=='SURVEY LINK' && (current===0  ||current===1)? 
   <>      
      <Steps current={current} items={items} className='mt20'>
  <Step title="Create Questionnaire" />
  <Step title="Select Distributor" />

 
    </Steps>

  
      <div className="steps-content" >{steps[current].content}</div>
  
      </>
:''}
       
          {tabName === 'SURVEY' &&(
            <>
              {/* <TableContents history={history} next={next} /> */}
            </>
          )}
          {tabName === 'REPORT' && <QuestionnaireReport />}
          {tabName === 'SURVEY LINK' && (<SurveyLink/>)}
    
      </div>
    </div>
  );
};

export default QuestionnaireDashboard;
