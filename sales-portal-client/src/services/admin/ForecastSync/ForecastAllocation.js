import { useState } from 'react';
import { connect } from 'react-redux';
import Util from '../../../util/helper';
import { Button, Checkbox, Select } from 'antd';
import _ from 'lodash';
import * as AdminAction from '../actions/adminAction';

const { Option } = Select;

function Allocation(props) {
    const { syncForecastAllocation, insertSyncLog, onCancel } = props;
    const [allocationPayload, setAllocationPayload] = useState({
        forecast_month: Util.applicableMonth('next'),
        stock_norm_sync: true,
        forecast_total_sync: true,
        forecast_allocation_sync: true,
    });
    const [isSubmitDisabled, setIsSubmitDisabled] = useState(false);

    function handleInputChange(field, value) {
        if (value === '') value = null;
        const currValue = _.cloneDeep(allocationPayload);
        currValue[field] = value;
        setAllocationPayload(currValue);
    }

    function onSubmit() {
        const payload = {
            type: 'ARS_FORECAST_ALLOCATION',
            result: 'SUCCESS',
            configuration: allocationPayload,
            isCronJob: false,
        };
        setIsSubmitDisabled(true);
        insertSyncLog(payload)
            .then((res) => {
                if (res.success) {
                    Util.notificationSender('Success', `ARS_FORECAST_ALLOCATION is running in the background`, true);
                    syncForecastAllocation(payload.configuration);
                    onCancel();
                } else {
                    setIsSubmitDisabled(false);
                    Util.notificationSender('Failure', `Failed to run ARS_FORECAST_ALLOCATION`, false);
                }
            })
            .catch(() => {
                setIsSubmitDisabled(false);
                Util.notificationSender('Failure', `Failed to run ARS_FORECAST_ALLOCATION`, false);
            });
    }
    return (
        <div className="allocation-container">
            <div className="formItems">
                <label>Forecast Month</label>
                <Select
                    placeholder="Forecast Month"
                    getPopupContainer={(trigger) => trigger.parentNode}
                    onChange={(month) => handleInputChange('forecast_month', month)}
                    defaultValue={allocationPayload.forecast_month}>
                    <>
                        <Option value={Util.applicableMonth()}>Current Month</Option>
                        <Option value={Util.applicableMonth('next')}>Next Month</Option>
                    </>
                </Select>
            </div>
            <div className="formItems">
                <Checkbox checked={allocationPayload.stock_norm_sync ?? false} onChange={(e) => handleInputChange('stock_norm_sync', e.target.checked)}>
                    Stock Norm Sync
                </Checkbox>
            </div>
            <div className="formItems">
                <Checkbox checked={allocationPayload.forecast_total_sync ?? false} onChange={(e) => handleInputChange('forecast_total_sync', e.target.checked)}>
                    Forecast Total Sync
                </Checkbox>
            </div>
            <div className="formItems">
                <Checkbox checked={allocationPayload.forecast_allocation_sync ?? false} onChange={(e) => handleInputChange('forecast_allocation_sync', e.target.checked)}>
                    Forecast Allocation Sync
                </Checkbox>
            </div>
            <div style={{ marginTop: '10px', textAlign: 'right' }}>
                <Button type="primary" disabled={isSubmitDisabled} onClick={onSubmit}>
                    Submit
                </Button>
            </div>
        </div>
    );
}

const mapStateToProps = (state) => {
    return {};
};

const mapDispatchToProps = (dispatch) => {
    return {
        insertSyncLog: (payload) => dispatch(AdminAction.insertSyncLog(payload)),
        syncForecastAllocation: (payload) => dispatch(AdminAction.syncForecastAllocation(payload)),
    };
};
const ForecastAllocationSync = connect(mapStateToProps, mapDispatchToProps)(Allocation);
export default ForecastAllocationSync;
