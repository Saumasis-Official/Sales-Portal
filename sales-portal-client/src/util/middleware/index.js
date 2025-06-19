import Auth from './auth';
import axios from 'axios'
import * as API from '../../api/index';


async function underMaintenance(history) {
	const adminRole = Auth.getAdminRole();
	let apiUrl = `${API.url('get_maintenance_status', 'auth')}`;
	const result = await axios.get(apiUrl);
	if (result.data) {
		if (result.data.length > 0) {
			if (result.data[0].status == 'OPEN') {
				if (!adminRole.includes('SUPER_ADMIN') || !adminRole.includes('SUPPORT')) history.push('/maintenance');
			}
		}
	}
}

function authenticatedUsersOnly(nextState, history) {
	// debugger
	if (!Auth.loggedIn()) {
		history.replace({
			pathname: '/',
			state: { nextPathname: nextState },
		});
	}
}

function notLoggedIn(path, replace) {
	if (Auth.loggedIn()) {
		replace({
			pathname: '/distributor/dashboard',
			state: { nextPathname: path },
		});
	} else if (Auth.adminLoggedIn()) {
		replace({
			pathname: '/admin/dashboard',
			state: { nextPathname: path },
		});
	}
}

function logoutUser(nextState, replace) {
	Auth.logout();
	replace({
		pathname: '/',
		state: { nextPathname: nextState.location.pathname },
	});
}
export { authenticatedUsersOnly };
export { notLoggedIn };
export { logoutUser };
export { underMaintenance }