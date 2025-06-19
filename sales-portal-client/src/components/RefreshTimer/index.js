import React, { useEffect, useState, useRef } from 'react';
import { connect } from 'react-redux';

let RefreshTimer = props => {

    const { lastSync } = props;
    const hours = 0, minutes = 0, seconds = 0;

    const [[hrs, mins, secs], setTime] = useState([hours, minutes, seconds]);
    const timerEndedRef = useRef(false); // Ref to track if the timer has ended

    const secondsToTime = (lastSync) => {
        let diff = (new Date().getTime() - lastSync.getTime()) / 1000;
        if (diff < 21600) {
            diff = 21600 - diff;
            let hours = Math.floor(diff / (60 * 60));
            let divisor_for_minutes = diff % (60 * 60);
            let minutes = Math.floor(divisor_for_minutes / 60);
            let divisor_for_seconds = divisor_for_minutes % 60;
            let seconds = Math.ceil(divisor_for_seconds);
            setTime([hours, minutes, seconds]);
            props.setTimerEnd(false);
            timerEndedRef.current = false; // Reset the ref when the timer is set
        }
    };

    useEffect(() => {
        if (!lastSync) return;
        const lastRefresh = new Date(lastSync.toString());
        secondsToTime(lastRefresh);
    }, [lastSync]);

    useEffect(() => {
        const tick = () => {
            setTime(([hrs, mins, secs]) => {
                if (hrs === 0 && mins === 0 && secs === 0) {
                    if (!timerEndedRef.current) {
                        props.setTimerEnd(true);
                        timerEndedRef.current = true; // Set the ref to true to prevent multiple calls
                    }
                    return [0, 0, 0];
                } else if (mins === 0 && secs === 0) {
                    return [hrs - 1, 59, 59];
                } else if (secs === 0) {
                    return [hrs, mins - 1, 59];
                } else {
                    return [hrs, mins, secs - 1];
                }
            });
        };

        const timerId = setInterval(tick, 1000);
        return () => clearInterval(timerId);
    }, []);

    return (
        (hrs || mins || secs) ?
            <><p>Next sync in : &nbsp;<span style={{ color: '#1268B3' }}>{(hrs < 10 ? '0' + hrs : hrs) + ':' + (mins < 10 ? '0' + mins : mins) + ':' + (secs < 10 ? '0' + secs : secs)}</span></p></> :
            <div style={{ color: '#1268B3' }}>Syncing now...</div>
    );
};

RefreshTimer = connect(() => ({
})
)(RefreshTimer);


export default RefreshTimer;
