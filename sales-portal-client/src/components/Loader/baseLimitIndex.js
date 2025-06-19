import React from 'react';
import { connect } from 'react-redux';
import { Spin } from 'antd';
import { LoadingOutlined } from '@ant-design/icons';

const antIcon = <LoadingOutlined style={{ fontSize: 24 }} spin />;

let BLLoader = (props) => {
  const { isLoading } = props;
  const { isLoad } = isLoading;

  return (
    <>
      {(isLoad ||  isLoading) ? (
        <div className="bl-loader-container">
          <Spin indicator={antIcon}  />
        </div>
      ) : (
        <div>
          {props.children}
        </div>
      )}
    </>
  );
};

BLLoader = connect((store) => ({
  isLoading: store.loader.isLoading,
}))(BLLoader);

export default BLLoader;