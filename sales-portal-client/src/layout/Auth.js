import React from 'react';
import { underMaintenance } from '../util/middleware';
let AuthLayout = (props) => {

	return (
		<section className="main-page-wrapper otp-page-wrapper">
			<div className="main-page-left">
				<img src="/assets/images/home-pattern.png" alt="" />
			</div>
			<div className="main-page-right">
				<div className="better-logo">
					<img src="/assets/images/better-logo.svg" alt="" />
				</div>
				{props.children}
			</div>
		</section>
	)

}

export default AuthLayout;
