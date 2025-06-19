import { Route } from "react-router-dom"
import DistributorLayout from '../layout/Distributor';
import AdminDashboard from '../services/admin/Dashboard';
import TSERequests from '../services/admin/TSERequests';
import ASMRSMRequests from '../services/admin/ASMRSMRequests';
import SessionLog from '../services/admin/SessionLog';
import SyncJobs from '../services/admin/SyncJobs';
import UserManagement from '../services/admin/UserManagement/UserManagement';
import AppSettings from '../services/admin/AppSettings/AppSettings';
import Report from '../services/admin/Report/Report';
import ServiceDeliveryRequests from '../services/distributor/ServiceDeliveryRequests';
import Dashboard from '../services/distributor/Dashboard/Dashboard';
import CreateOrderPage from '../services/distributor/CreateOrder/CreateOrderPage';
import CreateOrderSucessPage from '../services/distributor/CreateOrder/CreateOrderSucessPage';
import PODetails from '../services/distributor/PODetails/PODetails';
import InvoiceDetails from '../services/distributor/OrderDetail/InvoiceDetails';
import OrderDetail from '../services/distributor/OrderDetail/OrderDetail';
import ReOrder from '../services/distributor/ReOrder/ReOrder';

import UpdateMaintenance from '../services/admin/MaintenanceSetting/MaintenanceSetting';
import SapMaterialDashboard from '../services/admin/SapMaterialDashboard';

import HelpSection from '../components/HelpSection/HelpSection';
import fileHistory from '../services/admin/fileHistory';
import PdpUpdateRequest from '../services/admin/PdpUpdateRequest/PdpUpdateRequest';
import Forecast from '../services/admin/Forecast/Forecast';
import ForecastDashboard from '../services/admin/Forecast/ForecastDashboard';
import StockLevelCheck from '../services/admin/StockLevelCheck/StockLevelCheck';
import CfaDepot from '../services/admin/CfaDepot/CfaDepot';
import MoqDashboard from '../services/admin/MoqDashboard/MoqDashboard';
import MdmMasterDashboard from '../services/admin/MdmDashboard/MdmMasterDashboard';
import MdMReport from '../services/admin/MdmDashboard/MdmReport/MdMReport';
import CfaSurvey from '../services/admin/Questionnaire/QuestionnaireDashboard'
import RuleConfigurations from "../services/admin/RuleConfigurations/RuleConfigurations";
import Persona from "../services/admin/Persona/Persona";
import RushOrderRequests from "../services/admin/RushOrder/RushOrderRequests";
import RushOrderRequests2 from "../services/admin/RushOrder/RushOrderRequests2";
import OrderRequestSuccessPage from "../services/distributor/CreateOrder/OrderRequestSuccessPage";
import EcomDashboard from '../services/admin/MTEcomDashboard/EcomDashboard';
import PoData from '../services/admin/MTEcomDashboard/PoData';
import Finance from '../services/admin/Finance/Finance';
import FinanceController from '../services/admin/financeController/financeController'
import RushOrderDetails from "../services/admin/RushOrder/RushOrderDetails";
import RushOrderDetails2 from "../services/admin/RushOrder/RushOrderDetails2";
import Moqpage from "../services/admin/Moqpage";
import RDD from "../services/admin/MTEcomDashboard/Mtecom-rdd";
import PDPUnlockRequest from "../services/admin/PDPUnlockRequest/PDPUnlockRequests";
import MTEcomCustomerDetails from "../services/admin/MTEcomDashboard/MTecomCustomerDetails";
import MTnkamCustomerDetails from "../services/admin/MTEcomDashboard/MTnkamCustomerDetails";
import MtecomReport from "../services/admin/Report/MtecomReport";
import ShopifyDashboard from "../services/admin/ShopifyDashboard/ShopifyDashboard";
import ShopifyPoDetails from "../services/admin/ShopifyDashboard/ShopifyPoDetails";
import ShopifyReport from "../services/admin/Report/ShopifyReports";
import CfaProcess from "../services/admin/CfaProcessLogs/CfaProcess";
import AutoClosure from "../services/admin/AutoClosure/AutoClosure";
import RequestingPage from "../services/admin/CreditLimit/RequestingPage";
import CreditDashboard from "../services/admin/CreditLimit/CreditDashboard";
import TransactionDetails from "../services/admin/CreditLimit/TransactionDetails";
import AutoClosureReports from '../services/admin/AutoClosure/AutoClosureReports';
import GTTransactionDetails from "../services/admin/CreditLimit/GTTransactionDetails";
import DeliveryCodeReports from "../services/admin/DeliveryCodeReports/DeliveryCodeReports";

export default function Admin() {
    return (
        <>
            <Route component={DistributorLayout} />
            <Route path='/admin/dashboard' exact component={AdminDashboard} />
            <Route path="/admin/tse-requests" exact component={TSERequests} />
            <Route path="/admin/pending-requests" exact component={ASMRSMRequests} />
            <Route path="/admin/session-log" exact component={SessionLog} />
            <Route path="/admin/distributor" exact component={Dashboard} />
            <Route path="/admin/po-details" exact component={PODetails} />
            <Route path="/admin/invoice-details" exact component={InvoiceDetails} />
            <Route path="/admin/sales-order" exact component={OrderDetail} />
            <Route path="/admin/sales-order/details" exact component={InvoiceDetails} />
            <Route path="/admin/sync-jobs" exact component={SyncJobs} />
            <Route path="/admin/user-management" exact component={UserManagement} />
            <Route path="/admin/app-settings" exact component={AppSettings} />
            <Route path="/admin/create-order" exact component={CreateOrderPage} />
            <Route path="/admin/create-order-success" exact component={CreateOrderSucessPage} />
            <Route path="/admin/order-request-sent-success" exact component={OrderRequestSuccessPage} />
            <Route path="/admin/re-order" exact component={ReOrder} />
            <Route path="/admin/report" exact component={Report} />
            <Route path="/admin/cfa-so-requests" exact component={ServiceDeliveryRequests} />
            <Route path='/admin/updatemaintenance' exact component={UpdateMaintenance} />
            <Route path='/admin/sap-material-dashboard' exact component={SapMaterialDashboard} />
            <Route path='/admin/file-upload-history' exact component={fileHistory} />
            <Route path="/admin/help" exact component={HelpSection} />
            <Route path="/admin/pdp-update" exact component={PdpUpdateRequest} />
            <Route path="/admin/forecast" exact component={Forecast} />
            <Route path="/admin/forecast-dashboard" exact component={ForecastDashboard} />
            <Route path="/admin/stock-level-check" exact component={StockLevelCheck} />
            <Route path="/admin/cfa-depot" exact component={CfaDepot} />
            <Route path="/admin/moq-dashboard" exact component={Moqpage} />
            <Route path="/admin/mdm-dashboard" exact component={MdmMasterDashboard} />
            <Route path="/admin/mdm-report" exact component={MdMReport} />
            <Route path="/admin/cfa-survey" exact component={CfaSurvey} />
            <Route path="/admin/rules-configuration" exact component={RuleConfigurations} />
            <Route path="/admin/persona" exact component={Persona} />
            <Route path="/admin/rush-order-requests" exact component={RushOrderRequests2} />
            <Route path="/admin/mt-ecom-dashboard" exact component={EcomDashboard} />
            <Route path="/admin/po-data" exact component={PoData} />
            <Route path="/admin/rush-order-details/:po_num/:dist_id" exact component={RushOrderDetails2} />
            <Route path="/admin/finance-details" exact component={Finance} />
            <Route path= "/admin/finance-controller-details" exact component= {FinanceController}></Route>
            <Route path="/admin/mt-ecom-rdd-management" exact component={RDD} />
            <Route path="/admin/pdp-unlock-requests" exact component={PDPUnlockRequest} />
            <Route path="/admin/rdd-item-list" exact component={PoData}></Route>
            <Route path="/admin/mt-ecom-customer-details" exact component={MTEcomCustomerDetails} />
            <Route path="/admin/mt-nkam-customer-details" exact component={MTnkamCustomerDetails} />
            <Route path="/admin/mt-ecom-report" exact component={MtecomReport} />
            <Route path="/admin/shopify-dashboard" exact component={ShopifyDashboard} />
            <Route path="/admin/shopify-po-details" exact component={ShopifyPoDetails} />
            <Route path="/admin/shopify-report" exact component={ShopifyReport} />
            <Route path="/admin/cfa-process" exact component={CfaProcess} />
            <Route path="/admin/auto-closure" exact component={AutoClosure} />
            <Route path="/admin/credit-limit-requesting-page" exact component={RequestingPage} />
            <Route path="/admin/credit-dashboard" exact component={CreditDashboard} />
            <Route path="/admin/cl-order-request/:transaction_id" exact component={TransactionDetails} />
            <Route path="/admin/auto-closure-reports" exact component={AutoClosureReports} />
            <Route path="/admin/cl-gt-request/:transaction_id" exact component={GTTransactionDetails} />
            <Route path="/admin/delivery-code-reports" exact component={DeliveryCodeReports} />
            
        </>
    )
}