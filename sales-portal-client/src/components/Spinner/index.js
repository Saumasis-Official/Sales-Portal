import React from 'react';
import { Spin } from 'antd';
import { LoadingOutlined } from '@ant-design/icons';
import PropTypes from 'prop-types';

// import './style.scss';

const Spinner = (props) => {
  const { font, loading, ...rest } = props;
  const antIcon = <LoadingOutlined style={{ fontSize: font }} spin />;
  return (
    <Spin
      indicator={antIcon}
      spinning={loading}
      {...rest}
    />
  )
};

Spinner.defaultProps = {
  font: 24,
  loading: false,
}

Spinner.propTypes = {
  font: PropTypes.number.isRequired,
  loading: PropTypes.bool,
}

export default Spinner;
