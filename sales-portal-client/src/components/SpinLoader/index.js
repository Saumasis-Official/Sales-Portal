import React from 'react'
import { connect } from 'react-redux'
import { Spin } from 'antd';


let SpinLoader = props => {

    const { isSpinning, message } = props;
    const { isSpin, text = '' } = isSpinning;
    
    return (
        <>
            {
                <div className="Spinner">
                    <Spin tip={(text != null && text.length > 0) ? text : message } size="large" spinning={isSpinning} delay={500}>
                        {props.children}
                    </Spin>

                </div>
            }
        </>

    )
};

SpinLoader = connect((store) => ({
    isSpinning: store.loader.isSpinning
})
)(SpinLoader)


export default SpinLoader;
