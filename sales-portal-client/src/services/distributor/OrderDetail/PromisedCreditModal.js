import React, { useState, useEffect } from 'react';
import { Modal } from 'antd';
import {
    Input,
    Radio,
    Space,
    DatePicker,
    TimePicker,
    notification,
} from 'antd';
import moment from 'moment';
import './OrderDetails.css';
import { connect } from 'react-redux';
import { RUPEE_SYMBOL } from '../../../constants';
import * as DashboardAction from '../actions/dashboardAction';
import * as Actions from '../../admin/actions/adminAction';
import config from '../../../config';
import * as AuthAction from '../../auth/action';
import Auth from '../../../util/middleware/auth';
const appConfig = config.app_level_configuration;


let PromisedCreditModal = (props) => {
    const { isPromiseModalOpen, credit_details, getCreditLimitDetails, distributorId, promiseCreditData, app_level_configuration, region_details } = props;
    const [creditData, setCreditData] = useState(props.creditData);
    const [reason, setReason] = useState('Full');
    const [amount, setAmount] = useState('');
    const [date, setDate] = useState(moment());
    const [time, setTime] = useState();
    const defaultTime = moment();
    const [originalTime, setOriginalTime] = useState(defaultTime);
    const [selected, setSelected] = useState('Full');
    const [promiseFlag, setPromiseFlag] = useState(false)
    const [selectedDate, setSelectedDate] = useState(moment().format('DD-MM-YYYY'));
    const defaultDate = moment()
    const [originalDate, setOriginalDate] = useState(defaultDate);
    const [selectedDateState, setSelectedDateState] = useState(moment());
    const [rddDate, setRddDate] = useState(props.creditData.reference_date);
    const [inputType, setInputType] = useState(props.creditData.input_type);
    const [authorizePdpRestriction, setAuthorizePdpRestriction] = useState(false);
    const rddEndDate = moment.utc(rddDate).endOf('day');
    const currentDate = moment().startOf('day');

    useEffect(() => {
        if (isPromiseModalOpen) {
            setAmount(Math.abs(props.setCreditDifference));
            setReason('Full');
            setOriginalTime(defaultTime);
            setTime();
            setSelected('Full');
            setSelectedDate(moment().format('DD-MM-YYYY'));
            setOriginalDate(originalDate);
            setSelectedDateState(moment());
            setDate(moment());

        }

    }, [isPromiseModalOpen]);

    useEffect(() => {
        if (app_level_configuration && app_level_configuration.length) {
            for (let config of app_level_configuration) {
                if (!config) continue;
                if (config.key === appConfig.pdp_restriction.key) {
                    setAuthorizePdpRestriction(config.value === appConfig.pdp_restriction.enable_value);
                }
            }
        } else {
            props.fetchAppLevelConfiguration();
        }
    }, [app_level_configuration]);

    useEffect(() => {
        if (moment(selectedDateState).isSame(moment(), 'day')) {
            setOriginalTime(defaultTime)
            setTime(defaultTime.format('hh:mm A'));
        }
        else { setOriginalTime(moment('09:00 AM', 'hh:mm A')); }
    }, [date]);

    //Calling Credit limit api before promise credit updates so that it update Open net value. 
    useEffect(async () => {
        await getCreditLimitDetails(distributorId);

    }, []);


    const handleCreditSubmit = (e) => {
        const formattedAmount = Number(amount);
        const regex = /^[1-9][0-9]*$/;
        if (typeof amount == 'string' && !regex.test(amount)) {
            notificationSender(
                'Error',
                'Please enter amount greater than zero.',
                false,
            );
            return;
        }

        if (
            reason == 'Partial' &&
            formattedAmount &&
            (formattedAmount === 0 ||
                formattedAmount < 0 ||
                Math.floor(formattedAmount) !== formattedAmount)
        ) {
            notificationSender(
                'Error',
                'Please enter valid partial amount.',
                false,
            );
            return;
        }
        if (typeof amount == 'number' && reason == 'Partial') {
            notificationSender(
                'Error',
                'Amount should not be blank and no decimal allowed !',
                false,
            );
            return;
        }
        window.localStorage.setItem('TCPL_Promised_credit_flag', false);


        const promiseCreditData = props.promiseCreditData || '';
        setPromiseFlag(true);
        if (promiseCreditData) {
            setCreditData((prevState) => ({
                ...prevState,
                confirmed_by: promiseCreditData.confirmed_by,
                distributor_id: promiseCreditData.distributor_id,
                credit_shortfall: promiseCreditData.credit_shortfall,
                input_type: promiseCreditData.input_type,
                open_order_value: promiseCreditData.open_order_value,
                promised_credit_date: moment(selectedDate, 'DD-MM-YYYY').format('YYYY-MM-DD'),
                promised_credit_time: time ? time : '12:00 PM',
                promised_credit: amount ? amount.toString() : amount,
                promised_credit_type: reason,

            }));
        }
        else {
            props.setCreditData((prevState) => ({
                ...prevState,
                promised_credit_date: date.format('YYYY-MM-DD'),
                promised_credit_time: time ? time : '09:00 AM',
                promised_credit: amount ? amount.toString() : amount,
                promised_credit_type: reason,
                open_order_value: credit_details?.OPENNETVALUE,
                type: "update"

            }));
        }
        props.setHandleCredit(e);
        getCreditLimitDetails(distributorId);
        
    };
    useEffect(() => {
        if (promiseFlag) {
            props.promiseCredit(creditData);
            setPromiseFlag(false);
        }
    }, [promiseFlag])



    const submitReason = (e) => {
        if (e.target.value == 'Full') {
            const formattedAmount = Math.abs(props.setCreditDifference);
            setAmount(formattedAmount);
            setSelected(e.target.value);
            setReason(e.target.value);
        } else if (e.target.value == 'Partial') {
            setReason(e.target.value);
            setSelected(e.target.value);
        }
    };

    const submitAmount = (e) => {
        setAmount(e.target.value);
    };

    const onTimeChange = (time, timeString) => {
        setTime(timeString);
        setOriginalTime(time);
        setDate(date);

        const selectedDateMoment = moment(selectedDateState, 'DD-MM-YYYY').startOf('day');
        const isTomorrow = selectedDateMoment.diff(currentDate, 'days') === 1;
        if (isTomorrow && moment(timeString, 'hh:mm A').isAfter(moment('02:00 PM', 'hh:mm A')) && inputType !== "First consent for promise credit") {
            setTime('02:00 PM');
            setOriginalTime(moment('02:00 PM', 'hh:mm A'));
        }
        if (selectedDateMoment.format('DD-MM-YYYY') === rddEndDate.format('DD-MM-YYYY') && moment(timeString, 'hh:mm A').isAfter(moment('12:00 PM', 'hh:mm A')) 
        && inputType == "First consent for promise credit") {
            setTime('12:00 PM');
            setOriginalTime(moment('12:00 PM', 'hh:mm A'));
        }
        if (authorizePdpRestriction == false || region_details.enable_pdp == false &&  moment(timeString, 'hh:mm A').isAfter(moment('12:00 PM', 'hh:mm A')) 
        && inputType == "First consent for promise credit" && !moment().isSame(selectedDateMoment, 'day')) {
             setTime('12:00 PM');
             setOriginalTime(moment('12:00 PM', 'hh:mm A'));
         }
        if (inputType == "First consent for promise credit" && moment(time).isBefore(moment())  && moment(selectedDateState).isSame(moment(), 'day')) {
            setOriginalTime(defaultTime)
            setTime(defaultTime.format('hh:mm A'));
        }  
    };
    const onDateChange = (date, dateString, timeString) => {
        setSelectedDate(dateString)
        setSelectedDateState(date)
        setOriginalDate(date);
        setDate(date);
        setTime(timeString)
        if (moment(selectedDateState).isSame(moment(), 'day')) {
            setOriginalTime(defaultTime)
        }
        else {
            setOriginalTime(moment('09:00 AM', 'hh:mm A'));
        }
    }

    /** Function to send notifications */
    const notificationSender = (message, description, type = null) => {
        if (type === true) {
            notification.success({
                message: message,
                description: description,
                duration: 3,
                className: 'notification-green',
            });
        } else if (type === false) {
            notification.error({
                message: message,
                description: description,
                duration: 5,
                className: 'notification-error error-scroll',
            });
        } else {
            notification.warning({
                message: message,
                description: description,
                duration: 8,
                className: 'notification-orange',
            });
        }
    };

    return (
        <Modal
            onCancel={props.onCancel}
            footer={null}
            wrapClassName="details-modal"
            visible={props.visible}
            maskClosable={false}
        >
            <h1>Credit Allocation</h1>
            <div className="basic-details">
                <div className="form-wrapper">
                    <span className="promise-label">
                        I understand that for my order to be fulfilled, I need
                        to credit amount
                        <b>
                            {' '}
                            &#8377;{Math.abs(props.setCreditDifference)}
                        </b>{' '}
                        urgently to TCPL's account, therefore I am providing my
                        consent for the Logistics team to plan delivery.{' '}
                        <br></br>
                    </span>
                </div>

                <div className="form-wrapper">
                    <Space
                        direction="horizontal"
                        style={{}}
                    >
                        <DatePicker
                            className="date"
                            format="DD-MM-YYYY"
                            clearIcon={null}
                            value={date}

                            /*Logic for promise credit day selection:
                                1st consent after submit -  
                                    a: Normal PDP days Promise consent time will be CurrentTime to RDD 12:00 PM
                                    b: Incase of  PDP Unlock then Promise consent time will be CurrentTime to D+1 Anytime
                                2st consent - Enable consent only after Current time to D+1, Time till 2 pm next day */

                            disabledDate={(current) => {
                                if (inputType === "First consent for promise credit") {
                                    if (authorizePdpRestriction == true && region_details.enable_pdp == true) {

                                        return current && (current < moment().startOf('day').utc() || current > rddEndDate);
                                    } else {
                                     
                                        return current && (current < moment().startOf('day').utc() || current > moment().add(1, 'days').endOf('day').utc());
                                    }
                                } else {
                                    return current && (current < moment().startOf('day').utc() || current > moment().add(1, 'days').endOf('day').utc());
                                }
                            }}
                            onChange={onDateChange}
                        />

                        {inputType === "First consent for promise credit" ?
                            <TimePicker
                                use12Hours
                                format="hh:mm A"
                                value={originalTime || moment('09:00 AM', 'hh:mm A')}
                                onChange={onTimeChange}
                                showNow={false}
                                clearIcon={null}
                                disabledHours={(currrent) => {
                                    const selectedDate = moment(selectedDateState).startOf('day');
                                    const currentHour = moment().hour();
                                    if (selectedDate.isSame(rddEndDate)) {                                                       // If it's the RDD end date, disable hours before the current hour and after 12
                                        return [...Array(currentHour).keys(), ...Array.from({ length: 12 }, (_, i) => i + 13)];
                                    } else {
                                        return Array.from({ length: 9 }, (_, i) => i);
                                    }

                                }}

                                disabledMinutes={(selectedHour) => {
                                    const selectedDate = moment(selectedDateState).startOf('day');
                                    const currentHour = moment().hour();
                                    const currentMinute = moment().minute();

                                    if (selectedDate.isSame(rddEndDate) && selectedHour === currentHour) {  // If it's the RDD end date and the selected hour is the current hour, disable minutes before the current minute
                                        return [...Array(60).keys()].filter(m => m < currentMinute);
                                    } else if (selectedHour === currentHour) {                          // If the selected hour is 12, disable minutes after 0
                                        return [...Array(currentMinute).keys()];
                                    }
                                    return [];

                                }}
                            /> :
                            <TimePicker
                                use12Hours
                                format="hh:mm A"
                                value={originalTime}
                                onChange={onTimeChange}
                                showNow={false}
                                clearIcon={null}
                                disabledHours={() => {
                                    const currentDate = moment().startOf('day');
                                    const selectedDate = moment(selectedDateState).startOf('day');
                                    const currentHour = moment().hour();

                                    if (selectedDate.isSame(currentDate, 'day')) {                                           // If the selected date is the current date, disable hours before the current hour
                                        return Array.from({ length: currentHour }, (_, i) => i);
                                    } else if (selectedDate.isSame(currentDate.clone().add(1, 'day'), 'day')) {              // If the selected date is the next day, disable hours after 2 PM
                                        return Array.from({ length: 24 - 14 }, (_, i) => i + 14);
                                    }
                                    return [];
                                 }}
                                disabledMinutes={(selectedHour) => {
                                    const currentDate = moment().startOf('day');
                                    const selectedDate = moment(selectedDateState).startOf('day');
                                    const currentHour = moment().hour();
                                    const currentMinute = moment().minute();

                                    if (selectedDate.isSame(currentDate, 'day') && selectedHour === currentHour) {          // If the selected hour is the current hour, disable minutes before the current minute
                                        return Array.from({ length: currentMinute }, (_, i) => i);
                                    }
                                    return [];
                                }}
                            />
                        }
                    </Space>
                </div>
                <div className="form-wrapper">
                    <Radio.Group value={selected}>
                        <Space direction="vertical">
                            <Radio onClick={submitReason} value={'Full'}>
                                {' '}
                                I will pay full amount
                            </Radio>
                            <Radio onClick={submitReason} value={'Partial'}>
                                I will pay partially
                                {reason == 'Partial' ? (
                                    <span className="input-with-symbol">
                                        <Input
                                            required
                                            type="number"
                                            placeholder="  10000"
                                            onChange={submitAmount}
                                            style={{ width: 100, marginLeft: 10 }}
                                            disabled={reason != 'Partial' ? true : false}
                                        />
                                        <span className="currency-symbol">{RUPEE_SYMBOL}</span>
                                    </span>
                                ) : null}
                            </Radio>
                        </Space>
                    </Radio.Group>
                </div>
                <div className="form-wrapper">
                    <span className="promise-label">
                        If payment is made by <b>{time ? time : '09: 00 AM'}</b> on{' '}
                        <span className="promise-label">
                            <b> {selectedDate}</b>
                        </span>
                        , then the order will be considered for the same day
                        delivery else the order will be considered for next day
                        delivery.
                        <br></br>
                    </span>
                </div>
            </div>
            <div className="form-buttons">
                <button
                    type="submit"
                    className="promisecredit-btn-submit"
                    onClick={handleCreditSubmit}
                >
                    Submit
                </button>
            </div>
        </Modal>
    );
};
const mapStateToProps = (state, ownProps) => {
    return {
        credit_details: state.dashboard.get('credit_details'),
        app_level_configuration: state.auth.get('app_level_configuration'),
        region_details: state.dashboard.get('region_details'),
    };
};
const mapDispatchToProps = (dispatch, ownProps) => {
    return {
        getCreditLimitDetails: (login_id) => dispatch(DashboardAction.getCreditLimitDetails(login_id)),
        promiseCredit: (data) => dispatch(Actions.promiseCredit(data)),
        fetchAppLevelConfiguration: () => dispatch(AuthAction.fetchAppLevelSettings()),
    };
};
const PromisedCreditModalPage = connect(
    mapStateToProps,
    mapDispatchToProps,
)(PromisedCreditModal);

export default PromisedCreditModalPage;
