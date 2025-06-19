import { Route } from "react-router-dom"
import DistributorLayout from '../layout/Distributor';

import Dashboard from '../services/distributor/Dashboard/Dashboard';
import CreateOrderPage from '../services/distributor/CreateOrder/CreateOrderPage';
import DistributorDetails from '../services/distributor/DistributorDetails/DistributorDetails';
import CreateOrderSucessPage from '../services/distributor/CreateOrder/CreateOrderSucessPage';
import PODetails from '../services/distributor/PODetails/PODetails';
import InvoiceDetails from '../services/distributor/OrderDetail/InvoiceDetails';
import OrderDetail from '../services/distributor/OrderDetail/OrderDetail';
import ReOrder from '../services/distributor/ReOrder/ReOrder';
import ChangePassword from '../services/distributor/ChangePassword/ChangePassword';
import HelpSection from '../components/HelpSection/HelpSection';
import ServiceDeliveryRequests from '../services/distributor/ServiceDeliveryRequests';
import ResponseQuestionnaire from '../services/admin/Questionnaire/ResponseQuestionnaire';
import OrderRequestSuccessPage from "../services/distributor/CreateOrder/OrderRequestSuccessPage";

export default function Distributor (){
    return (
        <>
        <Route path='/distributor'  component={DistributorLayout}/>

                <Route path="/distributor/dashboard" component={Dashboard}  />
                <Route path="/distributor/create-order" component={CreateOrderPage}  />
                <Route path="/distributor/create-order-success" component={CreateOrderSucessPage}  />
                <Route path="/distributor/po-details" component={PODetails}  />
                <Route path="/distributor/invoice-details" component={InvoiceDetails}  />
                <Route path="/distributor/profile" component={DistributorDetails}  />
                <Route path="/distributor/re-order" component={ReOrder}  />
                <Route path="/distributor/change-password" component={ChangePassword}  />
                <Route path="/distributor/sales-order" component={OrderDetail}  />
                <Route path="/distributor/sales-order/details" component={InvoiceDetails}  />
                <Route path="/distributor/service-delivery-requests" component={ServiceDeliveryRequests} />
                <Route path="/distributor/help" component={HelpSection} />
                <Route path="/distributor/cfa-survey" component={ResponseQuestionnaire}/>
                <Route path="/distributor/order-request-sent-success" exact component={OrderRequestSuccessPage} />

        </>
    )
}