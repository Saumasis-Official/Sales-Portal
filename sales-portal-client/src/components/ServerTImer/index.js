import React, { useEffect, useState } from 'react';
import Util from '../../util/helper';

let ServerTimer = props => {

    const [serverTime, setServerTime] = useState();

    useEffect(() => {
        const tick = () => {
            const now = Util.formatDateTime(new Date(), 'DD MMM, YYYY');
            setServerTime(now);
        };
        const currentServerTime = setInterval(() => tick(), 1000);
        return () => clearInterval(currentServerTime);
    }, [serverTime]);

    return (
        <span style={{ color: '#1268B3' }}>{serverTime}</span>
    );
};

export default ServerTimer;
