import * as API from '../../api'
import jwt from "jsonwebtoken";
import { MAX_FAILED_ATTEMPT_COUNT} from '../../config/constant';

const failedLoginLimit = MAX_FAILED_ATTEMPT_COUNT;

export default {

	loggedIn: () => {
		// return !! localStorage.token
		return !!window.localStorage.getItem("token");
	},

	adminLoggedIn: () => {
		return !!window.localStorage.getItem("TCPL_SSO_token");
	},

	setAccessToken: (token) => {
		window.localStorage.setItem('token', token);
		// localStorage.token = token;
	},

	getAccessToken: (token) => {
		return window.localStorage.getItem("token");
		//return localStorage.token;
	},

	getAdminAccessToken: () => {
		return window.localStorage.getItem("TCPL_SSO_token");
	},

	getAdminAccessDetails: () => {
		return window.localStorage.getItem("TCPL_SSOUserDetail");
	},

	deleteAccessToken: () => {
		localStorage.removeItem('token');
		localStorage.removeItem('TCPL_correlation_id');
		// delete localStorage.token  
	},

	logout: () => {
		localStorage.removeItem('token');
		localStorage.removeItem('TCPL_correlation_id');
		localStorage.removeItem('TCPL_SSO_token');
		localStorage.removeItem('user_id');
		localStorage.removeItem('email');
		// delete localStorage.token;
	},

	decodeToken: (token) => {
		return jwt.decode(token);

	},
	getLoginId: (token) => {
		return jwt.decode(window.localStorage.getItem("token")).login_id;
	},
	setRole: (role) => {
		window.localStorage.setItem('role', role);
		// localStorage.token = token;
	},
	getRole: () => {
		return !!window.localStorage.getItem('role');
		// localStorage.token = token;
	},
	getAdminRole: () => {
		const role = window.localStorage.getItem('role');
		return role?.split(",")??[]
	},
	checkAdminLogin: () => {
		return !!window.localStorage.getItem('amplify-redirected-from-hosted-ui')
	},
	removeSSOCreds: () => {
		localStorage.removeItem('TCPL_SSO_at');
		localStorage.removeItem('TCPL_SSO_token');
		window.localStorage.setItem("TCPL_SSOUserDetail", JSON.stringify({}));
		window.localStorage.removeItem("role");
		window.localStorage.removeItem("distributorRole");
		window.localStorage.removeItem("amplify-redirected-from-hosted-ui");
		window.localStorage.removeItem("SSOUserName");
		window.localStorage.removeItem("user_id");
		window.localStorage.removeItem("email");
	},
	getUserEmail: () => {
		const adminAccessDetails = JSON.parse(window.localStorage.getItem("TCPL_SSOUserDetail"));
		return adminAccessDetails?.username?.split('_')[1];

	},
	setDistributorRole: (roles = "DISTRIBUTOR") => {
		window.localStorage.setItem('distributorRole', roles);
	},
	getDistributorRole: () => {
		return window.localStorage.getItem('distributorRole');
	},
	getFailedLoginData : ()=>{
		let data = window.localStorage.getItem("failed-login");
		if(data && data!=null){
			data = JSON.parse(data);
		}
		return data;

	},
	setFailedLoginData : (distributorId,lastFailedAttempt,totalFailedAttempt=null)=>{
		const failedData =  window.localStorage.getItem("failed-login");
		let targetedDistributor = {
			failedAttempts: 1,
			last_failed_attempt : lastFailedAttempt
		}
		if(failedData && failedData!=null){
			let parsedData = JSON.parse(failedData);
			if(parsedData.hasOwnProperty(distributorId)){
				targetedDistributor = parsedData[distributorId];
				if(totalFailedAttempt && totalFailedAttempt>=failedLoginLimit){
					targetedDistributor.failedAttempts = totalFailedAttempt;
				}
				else if(targetedDistributor.failedAttempts>failedLoginLimit-1){
					targetedDistributor.failedAttempts = 1;
				}
				else{
					targetedDistributor.failedAttempts = targetedDistributor.failedAttempts+1;
				}
				targetedDistributor.last_failed_attempt=lastFailedAttempt;
			}
			else{
				parsedData[distributorId] = targetedDistributor;
			}
			window.localStorage.setItem("failed-login", JSON.stringify(parsedData));
		}
		else{
			let targetData = {};
			if(totalFailedAttempt && totalFailedAttempt>=failedLoginLimit){
				targetedDistributor.failedAttempts = totalFailedAttempt;
			}
			targetData[distributorId]=targetedDistributor;
			window.localStorage.setItem("failed-login", JSON.stringify(targetData));
		}
	},

	getSSOUserEmail(){
		const email = window.localStorage.getItem("email");
		return email;
	}
}