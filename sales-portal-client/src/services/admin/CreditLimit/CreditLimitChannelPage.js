import React, { useState } from 'react';
import { connect } from 'react-redux';
import { Radio } from 'antd';
import RequestingPage from './RequestingPage';
import GtRequestingPage from './GtRequestingPage';
import { hasEditPermission, pages, features } from '../../../persona/distributorNav';

// const { Option } = Select;

const CreditLimitChannelPage = () => {

    const getDefaultChannel = () => {
        if (hasEditPermission(pages.CREDIT_LIMIT, features.MT_REQUEST_CHANNEL)) {
            return 'mt';
        } else if (hasEditPermission(pages.CREDIT_LIMIT, features.GT_REQUEST_CHANNEL)) {
            return 'gt';
        }
    };

    const [selectedOption, setSelectedOption] = useState(getDefaultChannel());

    const handleOptionChange = (e) => {
        setSelectedOption(e.target.value);
    };

    return (
        <>
            <div className="btn-radio-wrapper">
                <div className="radio-grp-content">
                    <p>
                        <span id="customer-grp-p">Channel: </span>
                        <Radio.Group onChange={handleOptionChange} value={selectedOption} id="radio-grp">
                            {hasEditPermission(pages.CREDIT_LIMIT, features.MT_REQUEST_CHANNEL)&& <Radio value="mt">MT</Radio>}
                            {hasEditPermission(pages.CREDIT_LIMIT, features.GT_REQUEST_CHANNEL) && <Radio value="gt">GT</Radio>}
                        </Radio.Group>
                    </p>
                </div>
            </div>
            {selectedOption === 'mt' && <RequestingPage></RequestingPage>}
            {selectedOption === 'gt' && <GtRequestingPage></GtRequestingPage>}
        </>
    );
};

const mapStateToProps = () => {
    return {};
};

const mapDispatchToProps = () => {
    return {};
};

export default connect(mapStateToProps, mapDispatchToProps)(CreditLimitChannelPage);
