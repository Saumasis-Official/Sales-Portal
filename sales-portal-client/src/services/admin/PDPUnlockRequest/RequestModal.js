import React, { useState, useEffect, useRef } from "react";
import { connect } from 'react-redux';
import { Modal, DatePicker, Checkbox } from 'antd';
import moment from 'moment';

const PDPUnlockRequestModal = (props) => {
    const { RangePicker } = DatePicker;
  const { visible, onCancel, onSubmit, pdpUnlockConfirmText, pdpWindow } = props;

    const [comment, setComment] = useState('');
    const [canSubmit, setCanSubmit] = useState(false);
    const [dates, setDates] = useState(null);
    const [value, setValue] = useState(null);
    const [datesString, setDatesString] = useState(null);
    const [isChecked, setIsChecked] = useState(false);
    const startDateRef = useRef(null);
    useEffect(() => {
        if (comment.length > 9 && comment.length <= 255 && datesString?.length && datesString[0]) {
            setCanSubmit(true);
        } else {
            setCanSubmit(false);
        }
        
    }, [comment, datesString]);

  useEffect(() => {
    showConfirmationText();
  }, [pdpUnlockConfirmText.length, showConfirmationText])

  function showConfirmationText() {
    if (document.getElementById('pdp-unlock-check-span')) {
      document.getElementById('pdp-unlock-check-span').innerHTML = pdpUnlockConfirmText
    }
  }
    const handleComment = (event) => {
        const { value } = event.target
        setComment(value);
    };

  const handleSubmit = () => {
        setIsChecked(false)
        onSubmit({comment, datesString});
        setComment('');
        setDates(null);
        setValue(null);
        setDatesString(null);
        setCanSubmit(false);
        startDateRef.current = null;
        props.setIsEditMode(false);
        props.setChecked(false);
        props.setEnablePdpCheckbox(false);
        props.setIsEditingPdp(false);
    }

  const handleCancel = () => {
        setIsChecked(false)
        setComment('');
        setDates(null);
        setDatesString(null);
        setCanSubmit(false);
        onCancel();
        startDateRef.current = null;
    }

  const handleCheck = (e) => {
    setIsChecked(e.target.checked)
  }
  
  const getYearMonth = (date) => date.year() * 12 + date.month();

  // const checkDates = (current, { from, type }) => {
  //   if (from) {
  //     const lastDate = from.add(+pdpWindow-1, 'days');
  //     const endOfMonth = from.clone().endOf('month');
  //     const maxDate = lastDate.isBefore(endOfMonth) ? lastDate : endOfMonth;
  //     return current && (current < from || current > maxDate);
      
  //   }
  //   return current && (current < moment().startOf('day'));
  // };
  
  const onOpenChange = (open) => {
    if (open) {
      setDates([null, null]);
    } else {
      setDates(null);
    }
  };

  const disabledDate = (current) => {
    if (!dates || !dates[0]) {
      return current && (current < moment().startOf('day'));
    }
    // default code to understand the logic
    // const tooLate = dates[0] && current.diff(dates[0], 'days') > 7;
    // const tooEarly = dates[1] && dates[1].diff(current, 'days') > 7;
    // return !!tooEarly || !!tooLate;

    const lastDate = dates[0].clone().add(+pdpWindow-1, 'days');
    const endOfMonth = dates[0].clone().endOf('month');
    const maxDate = lastDate.isBefore(endOfMonth) ? lastDate : endOfMonth;
    return current && (current < dates[0] || current > maxDate);
    
  };
    return (
        <Modal
            title= {pdpUnlockConfirmText ? 'PDP Unlock Request' : 'Pre-approved PDP Unlock Request'}
            visible={visible}
            onCancel={handleCancel}
            footer={null}
            wrapClassName="comment-modal">
            <div className="comment-fld">
                <RangePicker
                  value={dates || value}
                  style={{ fontWeight: '600', width: '100%' }}
                  format="YYYY-MM-DD"
                  disabledDate={disabledDate}
                  onCalendarChange={(val,fs) => {setDates(val)}}
                  onChange={(val, fs) => {
                      setDatesString(fs);
                      setValue(val)
                    }}
                  onOpenChange={onOpenChange}
                  // onBlur={() => console.log('blur has been triggered')}
                />
            </div>
            
            <div className="comment-fld">
              <textarea
                value={comment}
                onChange={handleComment}
                placeholder="Enter comment for this PDP Unlock Request (10-255 characters)"
              />
        </div>
        {pdpUnlockConfirmText && 
          <div className="pdp-unlock-checkbox">
          <Checkbox onChange={handleCheck} checked={isChecked} />
          <span id="pdp-unlock-check-span" className="pdp-unlock-check-span"></span>
        </div>}
        
            <div className="comment-btn">
          <button disabled={!canSubmit || (pdpUnlockConfirmText && !isChecked)} type="submit" className="sbmt-btn" onClick={handleSubmit}>
                Submit
              </button>
            </div>
        </Modal>
    )
}

const mapStateToProps = (state, ownProps) => {
    return {};
  };
  const mapDispatchToProps = (dispatch, ownProps) => {
    return {};
  };
  
  const RequestModal = connect(
    mapStateToProps,
    mapDispatchToProps,
  )(PDPUnlockRequestModal);
  
  export default RequestModal;