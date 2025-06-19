// universal modal to be used to accept the comment from the user before submit 
import { Modal, Input } from 'antd';
import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';

const { TextArea } = Input;

function CommentModal(props) {
    const {
        open,
        okButtonText,
        cancelButtonText,
        onOk,
        onCancel,
        placeholder,
        title,
        eventIdentifier,
        minCommentLength,
        children,
        ...rest
    } = props;

    const [comment, setComment] = useState('');

    function handleCommentChange(e) {
        setComment(e.target.value);
    };

    function handleOk() {
        onOk(eventIdentifier, comment);
    };

    function handleCancel() {
        onCancel();
    };

    return (
        <Modal
            visible={true}
            title={title}
            onOk={handleOk}
            onCancel={handleCancel}
            okText={okButtonText}
            cancelText={cancelButtonText}
            okButtonProps={{ disabled: comment.length < minCommentLength, danger: okButtonText === "Delete" }}
            {...rest}
        >
            <TextArea
                showCount
                autoFocus
                minLength={minCommentLength}
                placeholder={placeholder}
                onChange={handleCommentChange}
            />
        </Modal>
    );

};

CommentModal.propTypes = {
    open: PropTypes.bool.isRequired,
    okButtonText: PropTypes.string.isRequired,
    cancelButtonText: PropTypes.string.isRequired,
    onOk: PropTypes.func.isRequired,
    onCancel: PropTypes.func.isRequired,
    placeholder: PropTypes.string.isRequired,
    title: PropTypes.string.isRequired,
    eventIdentifier: PropTypes.string,
    minCommentLength: PropTypes.number,
    children: PropTypes.node
};

CommentModal.defaultProps = {
    eventIdentifier: "COMMENT_MODAL",
    minCommentLength: 10
}

export default CommentModal;