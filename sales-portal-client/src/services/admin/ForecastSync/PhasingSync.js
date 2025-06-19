import { useEffect, useState } from 'react';
import Util from '../../../util/helper';
import * as AdminAction from '../actions/adminAction';
import { connect } from 'react-redux';
import { Button, InputNumber } from 'antd';
import _ from 'lodash';

function Phasing(props) {
    const { getForecastConfigurations, syncPhasing, insertSyncLog, onCancel } = props;
    const [errorObject, setErrorObject] = useState({});
    const [isSubmitDisabled, setIsSubmitDisabled] = useState(false);
    const weekList = ['w1', 'w2', 'w3', 'w4'];
    const phasing = {
        30: {
            w1: 23.33,
            w2: 23.33,
            w3: 23.33,
            w4: 30.01,
            fn12: 46.66,
            fn34: 53.34,
        },
        31: {
            w1: 22.58,
            w2: 22.58,
            w3: 22.58,
            w4: 32.26,
            fn12: 45.16,
            fn34: 54.84,
        },
    };
    const [phasingPayload, setPhasingPayload] = useState({
        ...phasing[30],
        applicableMonth: Util.applicableMonth(),
    });

    useEffect(() => {
        getForecastConfigurations('AP01').then((res) => {
            const data = res?.data?.data?.rows ?? null;
            let daysInMonth = 30;
            if (data) {
                daysInMonth = new Date(data.applicable_month.substr(0, 4), data.applicable_month.substr(4, 6), 0).getDate();
                daysInMonth = daysInMonth <= 29 ? 30 : daysInMonth;
                setPhasingPayload({});
                setPhasingPayload({
                    ...phasing[daysInMonth],
                    applicableMonth: data.applicable_month,
                });
            }
        });
    }, []);

    const validateInputChange = (data) => {
        const tempValidationObj = {};
        const decimalRegex = /^\d+(\.\d{1,2})?$/;
        if (!decimalRegex.test(data.w1) || !decimalRegex.test(data.w2) || !decimalRegex.test(data.w3) || !decimalRegex.test(data.w4))
            tempValidationObj.weekly = 'Weekly values shouldnt contain 3 decimal places';
        if ((data.fn12 + data.fn34).toFixed(2) != 100) tempValidationObj.fn = 'Sum of all phasing should be 100%';
        setIsSubmitDisabled(Object.keys(tempValidationObj).length > 0 ? true : false);
        setErrorObject(tempValidationObj);
    };

    const handleForecastPhasingInputChange = (key, next, value, fn) => {
        if (value === null) value = 0;
        const fnVal = phasingPayload[next] + value;
        const currValue = _.cloneDeep(phasingPayload);
        currValue[key] = value;
        currValue[fn] = parseFloat(fnVal.toFixed(2));
        setPhasingPayload({ ...phasingPayload, ...currValue });
        validateInputChange(currValue);
    };

    const handleSubmit = () => {
        const payload = {
            type: 'ARS_PHASING',
            result: 'SUCCESS',
            configuration: phasingPayload,
            isCronJob: false,
        };
        setIsSubmitDisabled(true);
        insertSyncLog(payload)
            .then((res) => {
                if (res.success) {
                    Util.notificationSender('Success', `ARS_PHASING' is running in the background`, true);
                    syncPhasing(payload.configuration);
                    onCancel();
                } else {
                    Util.notificationSender('Failure', `Failed to run ARS_PHASING`, false);
                    setIsSubmitDisabled(false);
                }
            })
            .catch(() => {
                Util.notificationSender('Failure', `Failed to run ARS_PHASING`, false);
                setIsSubmitDisabled(false);
            });
    };

    return (
        <div className="formItems">
            <table className="table-brand-variants">
                <thead>
                    <tr>
                        <th>Weekly</th>
                        <th>Percentage Division(%)</th>
                    </tr>
                </thead>
                <tbody>
                    {weekList.map((item, index) => {
                        return (
                            <tr key={item}>
                                <td>{`Week ${index + 1}`}</td>
                                <td style={{ textAlign: 'center' }}>
                                    <InputNumber
                                        min={0}
                                        style={{ width: '150px' }}
                                        placeholder={`Value for Week ${index + 1}`}
                                        value={phasingPayload[item]}
                                        onChange={(val) => {
                                            const next = index % 2 > 0 ? weekList[index - 1] : weekList[index + 1];
                                            const fn = item > next ? `fn${next.split('w')[1]}${item.split('w')[1]}` : `fn${item.split('w')[1]}${next.split('w')[1]}`;
                                            handleForecastPhasingInputChange(item, next, val, fn);
                                        }}
                                    />
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
            <table style={{ marginTop: '20px' }} className="table-brand-variants">
                <thead>
                    <tr>
                        <th>Fortnightly</th>
                        <th>Percentage Division(%)</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>Week 1-2</td>
                        <td style={{ textAlign: 'center' }}>{phasingPayload.fn12}</td>
                    </tr>
                    <tr>
                        <td>Week 3-4</td>
                        <td style={{ textAlign: 'center' }}>{phasingPayload.fn34}</td>
                    </tr>
                </tbody>
            </table>
            {Object.hasOwn(errorObject, 'fn') && (
                <p style={{ marginTop: '10px' }} className="audit-trail">
                    {errorObject.fn}
                </p>
            )}
            <p style={{ marginTop: '10px' }} className="audit-trail">
                {`[Changes made will be effective for ${Util.applicableMonthToMonthYearString(phasingPayload.applicableMonth)}]`}
            </p>
            <div style={{ marginTop: '10px', textAlign: 'right' }}>
                <Button type="primary" onClick={handleSubmit} disabled={isSubmitDisabled}>
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
        getForecastConfigurations: (area) => dispatch(AdminAction.getForecastConfigurations(area)),
        syncPhasing: (payload) => dispatch(AdminAction.syncPhasing(payload)),
        insertSyncLog: (payload) => dispatch(AdminAction.insertSyncLog(payload)),
    };
};
const PhasingSync = connect(mapStateToProps, mapDispatchToProps)(Phasing);
export default PhasingSync;
