import { connect } from 'react-redux';
import { Select, Space, DatePicker, Tooltip, notification, Row, Col, Steps } from 'antd';
import moment from 'moment';
import { CheckCircleOutlined, FormOutlined, DeleteOutlined } from '@ant-design/icons';
import './survey.css';
import { useEffect, useRef, useState } from 'react';
import { CloseCircleTwoTone } from '@ant-design/icons';
import * as AuthAction from '../../auth/action';
import Auth from '../../../util/middleware/auth';

import Util from '../../../util/helper/index';
import _ from 'lodash';
import Loader from '../../../components/Loader';
import * as SurveyAction from '../../distributor/actions/surveyAction';

import * as AdminAction from '../actions/adminAction';

import React from 'react';
import 'antd/dist/antd.css';
import { label } from 'aws-amplify';

const TableContent = (props) => {
    const [disableEdit, setDisableEdit] = useState(false);
    const adminAccessDetails = JSON.parse(Auth.getAdminAccessDetails());
    const logistics_email = adminAccessDetails?.username?.split('_')[1];
    const {
        update_cfa_question_by_admin,
        get_cfa_questions,
        active_depot_distributors,
        next,
        survey_depot_details,
        survey_details,
        survey_date,
        update_survey,
        survey_question,
        get_depot_code,
    } = props;
    const { Step } = Steps;
    const { OptGroup } = Select;
    const [questionList, setQuestionList] = useState([]);
    const [depot, setDepotCode] = useState();
    const [details, setDetails] = useState();
    const [openBox, setOpenBox] = useState(false);
    const [checkrange, setCheckRange] = useState(false);
    const [currentDepot, setCurrentDepot] = useState();
    const [showReport, setShowReport] = useState(false);
    const [currentDescription, setCurrentDescription] = useState(null);
    const [allDepotDBDetails, setAllDepotDBDetails] = useState();
    const [selectedDepot, setSelectedDepot] = useState(null);
    const [questionTableHeight, setQuestionTableHeight] = useState(0);
    const [questionTableHeaderHeight, setQuestionTableHeaderHeight] = useState(0);
    const [selectedDepo, setSelectedDepo] = useState();
    const [depoCode, setDepoCode] = useState([]);

    const now = new Date();
    const questionRef = useRef();
    const questionTableElement = useRef();

    useEffect(() => {
        questionTableElement.current = document.getElementById('question-table');
        const questionTableHeight = questionTableElement.current?.offsetHeight;
        const questionTableHeaderHeight = questionTableElement.current?.children[0]?.offsetHeight;
        setQuestionTableHeight(questionTableHeight);
        setQuestionTableHeaderHeight(questionTableHeaderHeight);
    }, [questionList]);

    const handleChange = (e, i) => {
        let newArr = [...questionList];
        newArr[i].question = e.target.value;
        setQuestionList(newArr);
    };

    // function checkRange(start, end) {
    //   let result = moment(moment(now).format('YYYY-MM-DD')).isBetween(
    //     start,
    //     end,
    //   );
    //   setDisableEdit(result ? true : false);
    //   setCheckRange(result ? true : false);
    // }

    async function handleChanges(depot_code) {
        setSelectedDepot(depot_code);
        let result = depot?.find((data) => data.value === depot_code);
        if (result?.description?.includes('&')) {
            let firstname = result?.description.split('&')[0];
            let secondname = result?.description.split('&')[1];
            setCurrentDescription(firstname + '' + secondname);
        } else {
            setCurrentDescription(result?.description);
        }
        if (depot_code !== undefined) {
            get_cfa_questions({ depot_code: [depot_code] }).then((res) => {
                if (res?.success) {
                    let result = [];

                    Object.values(res.data[0].questions).map((data, i) => {
                        result.push({
                            question: data,
                            edit: false,
                        });
                    });
                    setDetails({
                        logistic_id: res.data[0]?.logistic_id,
                        updated_on: res.data[0]?.updated_on,
                        survey_start: res.data[0]?.survey_start,
                        survey_end: res.data[0]?.survey_end,
                        update_on: res.data[0]?.updated_on,
                        applicable_distributors: res.data[0]?.applicable_distributors,
                        dbs_responded: res.data[0]?.dbs_responded,
                        logistics_name: res.data[0].logistics_name,
                    });
                    // checkRange(
                    //   res.data[0].survey_start,
                    //   res.data[0].survey_end,
                    // );
                    setQuestionList(result);
                    questionRef.current = JSON.parse(JSON.stringify(result));
                } else {
                    setDisableEdit(true);
                    questionRef.current = [];
                    setQuestionList([]);
                    setDetails({
                        logistic_id: null,
                        updated_on: null,
                        survey_start: null,
                        survey_end: null,
                        update_on: null,
                        applicable_distributors: null,
                        dbs_responded: null,
                        logistics_name: null,
                    });
                }
            });
        } else {
            setDisableEdit(true);
            setQuestionList([]);
            questionRef.current = [];
        }
    }
    useEffect(() => {
        depotCode();

        if (survey_details) {
            submit(survey_depot_details, survey_date);
        }
    }, []);

    async function depotCode() {
        const adminRole = Auth.getAdminRole();
        let body = _.isEmpty(_.intersection(adminRole, ['SUPPORT', 'SUPER_ADMIN'])) ? { logistics_email } : null;
        let results = await get_depot_code(body);
        let filterdepo;
        if (results && results.data && results.success) filterdepo = results?.data?.map((data) => data.depot_code);

        let result = await active_depot_distributors();
        result = result?.data?.filter((data) => filterdepo.includes(data.depot_code));
        if (result) {
            setAllDepotDBDetails(result.data);

            let filterResult = result?.filter((data) => !data.active_survey);

            //  setDepoCode(filterResult.map(data=>data.depot_code))
            let filteDepoCode = filterResult.map((data) => data.depot_code);
            // filteDepoCode
            filteDepoCode = results?.data?.filter((data) => {
                if (filteDepoCode.includes(data.depot_code)) {
                    return true;
                } else {
                    return false;
                }
            });
            setDepoCode(filteDepoCode);

            setDepotCode(
                result?.map((data) => ({
                    label: data.depot_code,
                    value: data.depot_code,
                    // description: data.description,
                    all_distributors: data.applicable_distributors,
                    active: data.active_survey,
                })),
            );

            handleChanges(result?.[0]?.depot_code);
            setCurrentDepot(result?.[0]?.depot_code);
            setSelectedDepot(result?.[0]?.depot_code);
        }
    }

    function handleSave(i) {
        let newArr = [...questionList];
        if (newArr[i]?.question?.length >= 10) {
            newArr[i].edit = newArr[i].edit ? false : true;
            setQuestionList(newArr);
            questionRef.current = JSON.parse(JSON.stringify(newArr));
            setDisableEdit(false);
        } else {
            notification.error({
                message: 'please fill all the fields',
                description: ` line ${i + 1} must be greater than 10 characters`,
                duration: 10,
                className: 'notification-error',
            });
        }
    }

    const handleEdit = (i, status) => {
        let newArr = _.cloneDeep(questionRef.current);
        newArr[i].edit = status;
        setQuestionList(newArr);
    };

    function rowAdd() {
        setDisableEdit(true);

        if (checkrange === false) {
            let newArr = [];
            if (questionList === undefined) {
                newArr.push({
                    question: '',
                    edit: true,
                });
            } else {
                newArr = [...questionList];
                newArr.push({
                    question: '',
                    edit: true,
                });
            }

            setQuestionList(newArr);
        }
    }
    async function submit(depotCodeDB, date) {
        let obj = {};
        survey_question.forEach((item, i) => {
            obj[i + 1] = item.question;
        });
        const body = {
            depot_code_distributors: Object.keys(depotCodeDB)?.map((key) => ({
                depot_code: key,
                applicable_distributors: depotCodeDB[key],
            })),
            questions: obj,
            survey_start: moment(date[0]).format('YYYY-MM-DD'),
            survey_end: moment(date[1]).format('YYYY-MM-DD'),
        };
        try {
            const res = await update_cfa_question_by_admin(body);
            res.success &&
                notification.success({
                    message: 'Questions added successfully',
                    description: `${Object.keys(depotCodeDB)?.join(',')}`,
                    duration: 10,
                    className: 'notification-green',
                });
            update_survey({ depot_code: {}, date: [], status: false, questions: [] });
        } catch (error) {
            notification.error('Something went wrong');
        }
    }

    function handleDelete(i) {
        if (questionList.length > 1) {
            let newArr = [];
            questionList.filter((data, index) => {
                if (index !== i) {
                    newArr.push(data);
                }
            });
            setQuestionList(newArr);
            questionRef.current = JSON.parse(JSON.stringify(newArr));
        } else {
            notification.error({
                message: 'At least 1 questions are required in survey',
                description: '',
                duration: 10,
                className: 'notification-error',
            });
        }
    }

    const depoSelect = (select) => {
        setSelectedDepo(select);
    };

    return (
        <div>
            <Loader>
                {depoCode.length > 0 && (
                    <div className="questionnaire-header mtd-20 ml-25 h-100">
                        <Space className="width100" direction="vertical">
                            <div className="depot_code_select">
                                <span className="survey-select-title">Select Depot Code</span>
                                <Select
                                    placeholder="Select Depot Code"
                                    className="tableContent-select ml-10"
                                    mode="multiple"
                                    allowClear
                                    onChange={(value) => depoSelect(value)}
                                    options={depoCode.map((item) => ({
                                        label: `${item?.depot_code}  ${item?.description}`,
                                        value: item.depot_code,
                                    }))}
                                    style={{ minWidth: '230px', width: 'auto' }}
                                    // value={selectedDepo?.map((item) => item)}
                                />
                            </div>
                        </Space>
                    </div>
                )}
            </Loader>

            <Loader>
                <div className="questionnaire-table postion-relative mtn40">
                    <div>
                        <div className="admin-dashboard-table">
                            <>
                                <div class="n-card-h mt2">
                                    <button type="submit" class="addmore-button">
                                        <img src="/assets/images/add-order.svg" alt="Add New Item" onClick={() => rowAdd()} />
                                    </button>
                                </div>
                                <Row>
                                    <Col flex="1 1 70%" className="question-table-container">
                                        <table id="question-table">
                                            <thead>
                                                <tr>
                                                    <th className="width7 text-center">Sr No.</th>
                                                    <th className="width50 text-left">Questions</th>

                                                    <th
                                                        className="width30 text-right pr50"
                                                        style={{
                                                            paddingRight: '60px',
                                                        }}>
                                                        Actions
                                                    </th>
                                                </tr>
                                            </thead>

                                            <tbody>
                                                {questionList.length > 0 ? (
                                                    questionList.map((data, i) => (
                                                        <tr>
                                                            <td className="width5 text-center">{i + 1}</td>
                                                            <td className="width50 text-left">
                                                                {data.edit ? (
                                                                    <textarea className="edit-text-area" type="text" value={data.question} onChange={(e) => handleChange(e, i)} />
                                                                ) : (
                                                                    data.question
                                                                )}
                                                            </td>

                                                            <td className="width30 pr50 text-right" style={{ paddingRight: '50px' }}>
                                                                {data.edit ? (
                                                                    <em className="edit-distributor-contact-icon" onClick={() => handleEdit(i, false)}>
                                                                        <CloseCircleTwoTone />
                                                                    </em>
                                                                ) : (
                                                                    <em className="edit-distributor-contact-icon" onClick={() => handleEdit(i, true)}>
                                                                        <Tooltip placement="bottom" title="Edit">
                                                                            <FormOutlined />
                                                                        </Tooltip>
                                                                    </em>
                                                                )}
                                                                <em className={data.edit ? 'edit-distributor-contact-icon' : 'save-icon-disabled ml-8'}>
                                                                    <Tooltip placement="bottom" title="Save" onClick={() => handleSave(i)} defaultVisible={false}>
                                                                        <CheckCircleOutlined />
                                                                    </Tooltip>
                                                                </em>
                                                                <em className="edit-distributor-contact-icon">
                                                                    <Tooltip placement="bottom" title="Delete" onClick={() => handleDelete(i)}>
                                                                        <DeleteOutlined />
                                                                    </Tooltip>
                                                                </em>
                                                            </td>
                                                        </tr>
                                                    ))
                                                ) : (
                                                    <tr className="width50">
                                                        <td></td>
                                                        <td>No Question Found</td>
                                                        <td></td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </Col>
                                    {/* <Col flex="0 1 20%">
                        <ApplicableDistributorsTable applicableDistributors={details?.applicable_distributors} respondedDistributors={details?.dbs_responded} allDistributors={depot?.find(i => i.label === selectedDepot)?.all_distributors} tableHeight={questionTableHeight} tableHeaderHeight={questionTableHeaderHeight} />
                      </Col> */}
                                </Row>
                            </>
                        </div>
                    </div>
                    {/* {showReport && (
                  <SurveyReportModal
                    depotCodes={depot.map((item) => item.value)}
                    open={showReport}
                    onReportCancel={handleReportModalCancel}
                  />
                )} */}
                    <button
                        onClick={() => next(selectedDepo, questionList)}
                        disabled={Array.isArray(selectedDepo) && selectedDepo?.length > 0 ? false : true}
                        className="submitButton space-end mt30 ml-auto">
                        Next
                    </button>
                </div>
                {details?.survey_start != null && details?.survey_end != null && details?.update_on != null ? (
                    <div className="updated_on">
                        <span>
                            Last Update By-{details?.logistics_name}, {Util.formatDate(details?.update_on)}, {Util.formatTime(details?.update_on)}
                        </span>
                        <br />
                        {/* <span>
                {checkrange &&
                  `Edit is disabled between ${Util.formatDate(
                    details?.survey_start,
                  )} to ${Util.formatDate(details?.survey_end)}`}
              </span> */}
                    </div>
                ) : (
                    ''
                )}
            </Loader>
        </div>
    );
};

const mapStateToProps = (state) => {
    return {
        survey_details: state.survey.get('loading'),
        survey_depot_details: state.survey.get('depot_code'),
        survey_date: state.survey.get('date'),
        survey_question: state.survey.get('questions'),
    };
};
const mapDispatchToProps = (dispatch) => {
    return {
        get_depot_code: (logistics_email) => dispatch(AuthAction.get_Depot_Code(logistics_email)),
        update_cfa_question_by_admin: (data) => dispatch(AuthAction.update_cfa_question_by_admin(data)),
        get_cfa_questions: (depot_code) => dispatch(AuthAction.get_cfa_questions(depot_code)),
        active_depot_distributors: () => dispatch(AdminAction.getActivePlantDistributors()),
        update_survey: (data) => dispatch(SurveyAction.update_survey(data)),
    };
};

const TableContents = connect(mapStateToProps, mapDispatchToProps)(TableContent);

export default TableContents;
