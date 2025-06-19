import React from 'react'
import { connect } from 'react-redux'
import { Skeleton } from 'antd';


let Loader = props => {

    const { isLoading } = props
    const { isLoad, text = '' } = isLoading;
    return (
        <>
            {
                (isLoad || isLoading) ? <div>
                    <Skeleton active />
                  
                </div> : <div>
                    {props.children}
                </div>
            }
        </>

    )
};

Loader = connect((store) => ({
    isLoading: store.loader.isLoading
})
)(Loader)


export default Loader;
