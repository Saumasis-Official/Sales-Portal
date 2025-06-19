import React, { Component } from 'react';
import axios from 'axios';
import * as API from '../api/index';
import { message } from 'antd';
import Auth from '../util/middleware/auth';
import { connect } from 'react-redux';
import * as Action from '../services/auth/action';

const mapStateToProps = () => {
	return {}
}
const mapDispatchToProps = (dispatch) => {
	return {
		authUpdateUserData: (data) => dispatch(Action.authUpdateUserData(data))
	}
}

class PublicPage extends Component {

	constructor(props) {
		super(props);
		let access_token = Auth.getAccessToken()
		if (access_token) {
			axios.get(API.url('validate_auth', "auth"))
				.then((response) => {
					if (response.data.success === true) {
						Auth.setAccessToken(access_token);
						this.props.authUpdateUserData(response.data.user);
					} else {
						message.error('Invalid auth token, please try logging in again', 3);
						Auth.deleteAccessToken();
					}
				})
				.catch((response) => {
				});
		}
	}
	render() {
		return (
			<div>
				{this.props.children}
			</div>
		)
	}
}

const PublicRoutePage = connect(mapStateToProps, mapDispatchToProps)(PublicPage);

export default PublicRoutePage;
