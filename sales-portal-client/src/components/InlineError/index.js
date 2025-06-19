import React from 'react'
import PropTypes from 'prop-types';
import './index.css'

const InlineError = props => { return <div class="inline-error">*{props.message}</div> }

InlineError.propTypes = {
    message: PropTypes.string,
}
InlineError.defaultProps = {
    message: '',
}

export default InlineError;