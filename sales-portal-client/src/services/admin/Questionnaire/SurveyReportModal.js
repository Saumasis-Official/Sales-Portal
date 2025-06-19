import React, { useState } from 'react';
import { connect } from 'react-redux';
import * as AdminActions from '../actions/adminAction'
import Modal from 'antd/lib/modal/Modal';
import { Checkbox } from 'antd';
import PropTypes from 'prop-types';
import Loader from '../../../components/Loader';
import Util from '../../../util/helper';
function SurveyReportModal(props) {
    const { getSurveyReport, depotCodes, open, onReportCancel } = props;
    const [indeterminate, setIndeterminate] = useState(true);
    const [checkAllDepotCodes, setCheckAllDepotCodes] = useState(true);
    const [selectedDepotCodes, setSelectedDepotCodes] = useState();

    function mapQuestionsWithFeedback(data) {
        const reportData = [];
        data.forEach(element => {
            element["Remarks"] = element?.response["comment"];
            const feedbackResponse = element?.response;
            delete element?.response;
            for (const key in feedbackResponse) {
                if (key.includes("q")) {
                    const question = feedbackResponse[key];
                    const feedback = feedbackResponse[`a${key.split("q")[1]}`];
                    element["Questions"] = question;
                    element["Feedback"] = feedback;
                    reportData.push({ ...element });
                }
            }
        })
        return reportData;
    }

    function handleOk() {
        async function fetchSurveyReport() {
            const reportData = await getSurveyReport({ depot_codes: selectedDepotCodes });
            if (!reportData?.success) {
                Util.notificationSender("Error", "Unable to download report.", false);
            } else if (reportData?.data?.length <= 0) {
                Util.notificationSender("Info", "No data found for selected depot codes", false);
            } else {
                const report = mapQuestionsWithFeedback(reportData?.data);
                Util.downloadExcelFile(report, `Survey_Report_${new Date().getFullYear()}-${(new Date().getMonth() + 1)}-${new Date().getDate()}`);
            }
        }
        fetchSurveyReport();
        onReportCancel();
    };

    function handleCancel() {
        onReportCancel();
    };

    function handleCheckAllChange(e) {
        setIndeterminate(false);
        setCheckAllDepotCodes(e.target.checked);
        setSelectedDepotCodes(e.target.checked ? depotCodes : []);
    };

    function handleDepotCodesChange(e) {
        setSelectedDepotCodes(e);
        setCheckAllDepotCodes(e.length === depotCodes.length);
        setIndeterminate(e.length > 0 && e.length < depotCodes.length);
    };

    return (
        <Loader>
            <Modal
                title="Select Depot Codes"
                centered
                visible={open}
                onOk={handleOk}
                onCancel={handleCancel}
                width={1000}
                height={400}
                footer={[
                    <button
                        key={"download"}
                        className='submitButton'
                        onClick={handleOk}
                        disabled={!selectedDepotCodes || selectedDepotCodes?.length <= 0}>
                        Download
                    </button>
                ]}
            >
                <Checkbox
                    indeterminate={indeterminate}
                    onChange={handleCheckAllChange}
                    checked={checkAllDepotCodes}>
                    Select all
                </Checkbox>
                <Checkbox.Group
                    options={depotCodes}
                    value={selectedDepotCodes}
                    onChange={handleDepotCodesChange}
                />

            </Modal>
        </Loader>
    );
}

SurveyReportModal.propTypes = {
    getSurveyReport: PropTypes.func.isRequired,
    depotCodes: PropTypes.array.isRequired,
    open: PropTypes.bool.isRequired,
    onReportCancel: PropTypes.func.isRequired,
};




const mapDispatchToProps = (dispatch) => {
    return {
        getSurveyReport: (depotCodes) => dispatch(AdminActions.getSurveyReport(depotCodes))
    }
};

export default connect(null, mapDispatchToProps)(SurveyReportModal);