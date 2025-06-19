import React, { useState, useEffect } from 'react';
import { connect } from 'react-redux';
import * as AdminActions from '../actions/adminAction';
import './Finance.css';
import Util from '../../../util/helper/index'
import { CaretRightOutlined } from '@ant-design/icons'
import { Collapse } from 'antd';
import Loader from '../../../components/Loader';

const Finance = (props) => {
    const { cleartaxPanDetails } = props;
    const [data, setData] = useState(null);
    const [search, setSearch] = useState(null);

    const panDetails = async () => {
        let payload = "";
        if (search.length === 10) {
            payload = { "pan": search }
        }
        else if (search.length === 15) {
            payload = {
                "gstin": search,
                "hsnDetails": true,
                "branchDetails": true,
                "filingDetails": true,
                "liabilityPaidDetails": true
            }
        }
        const response = await cleartaxPanDetails(payload);
        if (response.success === true) {
            Util.notificationSender('Success', response.message, true);
        } else {
            Util.notificationSender('Error', "Please Enter Valid GST/PAN Number", false)
        };
                setData(response.data);
    }

    return (
        <>
            <div className="admin-dashboard-wrapper">
                <div className="admin-dashboard-block">
                    <div className="form-groups">
                        <span className="title-flds"> <b className='mandatory-mark'>* </b>GSTIN/PAN Number</span>
                        <input
                            type="text"
                            className="form-controls"
                            placeholder="GST/PAN NUMBER"
                            value={search}
                            onChange={(e) => { setSearch(e.target.value) }}
                            onKeyPress={(e)=>{if(e.key==="Enter"){panDetails();}}}
                        />
                    </div>
                    <button
                        className="sbmt-btns"
                        onClick={panDetails}>
                        Search
                    </button>
                    <Loader>
                    {data?.pan &&
                        <div className='liab-dtls'>
                            <div>PAN: <span>{data?.pan}</span></div>
                            <div>Name: <span>{data?.name}</span></div>
                            <div>Type Of Holder:<span>{data?.typeOfHolder}</span></div>
                            <div>Valid:<span>{data?.isValid? "True":"False"}</span></div>
                            <div>Individual:<span>{data?.isIndividual ? "True":"False"}</span></div>
                            <div>PAN Status:<span>{data?.panStatus}</span></div>
                            <div>PAN Status Code: <span>{data?.panStatusCode}</span></div>
                            <div>PAN Operative Status:<span>{data?.panOperativeStatus}</span></div>
                            <div>Aadhaar Seeding Status:<span>{data?.aadhaarSeedingStatus}</span></div>
                            <div>Aadhaar Seeding StatusCode: <span>{data?.aadhaarSeedingStatusCode}</span></div>
                            <div>Financial Year: <span>{data?.finYear}</span></div>
                            <div>PAN - AADHAR Link Status: <span>{data?.panAadhaarLinkStatus}</span></div>
                            <div>Specified person U/s.206AB & 206CCA (Is Applicable) : <span>{data?.isApplicable}</span></div>
                            <div>PAN Allotment Date: <span>{data?.panAllotmentDate}</span></div>

                        </div>
                    }
                    {data?.basicDetails?.gstin &&
                            <div className="gst-container">
                            <table className="pdp-tbl"  >
                                <thead>
                                    <tr>
                                        <th style={{ width: '27%' }} >Basic Details</th>
                                    </tr>
                                </thead>
                            </table>
                            <Collapse bordered={false} expandIcon={({ isActive }) => <CaretRightOutlined rotate={isActive ? 90 : 0} />} className="collapse-gst-tbl">
                                <Collapse.Panel>
                                    <table className="gst-tbl">
                                        <tbody>
                                            <thead>
                                                <tr>
                                                    <th>GSTIN</th>
                                                    <th style={{ width: "6%" }}>Aggre Turn Over FY</th>
                                                    <th>Registration Type</th>
                                                    <th style={{ width: "6%" }}>Aggre Turn Over</th>
                                                    <th>Business Nature</th>
                                                    <th>Registration Date</th>
                                                    <th>Registration Status</th>
                                                    <th style={{ width: "9%" }}>Member Details</th>
                                                    <th>Nature of Business Activity</th>
                                                    {/* <th>Aadhaar Verified</th> */}
                                                    <th>Legal Business Name</th>
                                                    <th>Constitution Of Business</th>
                                                    <th>Trade Name</th>
                                                    <th>Central Jurisdiction</th>
                                                    {/* <th>EInvoice Mandated</th> */}
                                                    <th>State Jurisdiction</th>
                                                    {/* <th>EInvoice Opted</th> */}

                                                </tr>
                                            </thead>
                                            <tbody>
                                                <tr>
                                                    <td>{data?.basicDetails?.gstin}</td>
                                                    <td>{data?.basicDetails?.aggreTurnOverFY}</td>
                                                    <td>{data?.basicDetails?.registrationType}</td>
                                                    <td>{data?.basicDetails?.aggreTurnOver}</td>
                                                    <td>{data?.basicDetails?.businessNature}</td>
                                                    <td>{data?.basicDetails?.registrationDate}</td>
                                                    <td>{data?.basicDetails?.registrationStatus}</td>
                                                    <td>{data?.basicDetails?.memberDetails}</td>
                                                    <td>{data?.basicDetails?.natureOfCoreBusinessActivity}</td>
                                                    {/* <td>{data?.basicDetails?.aadhaarVerified}</td> */}
                                                    <td>{data?.basicDetails?.legalBusinessName}</td>
                                                    <td>{data?.basicDetails?.constitutionOfBusiness}</td>
                                                    <td>{data?.basicDetails?.tradeName}</td>
                                                    <td>{data?.basicDetails?.centralJurisdiction}</td>
                                                    {/* <td>{data?.basicDetails?.isEInvoiceMandated}</td> */}
                                                    <td>{data?.basicDetails?.stateJurisdiction}</td>
                                                    {/* <td>{data?.basicDetails?.isEInvoiceOpted}</td> */}
                                                </tr>
                                            </tbody>
                                        </tbody>
                                    </table>
                                </Collapse.Panel>
                            </Collapse>
                            <table className="pdp-tbl"  >
                                <thead>
                                    <tr>
                                        <th style={{ width: '27%' }} >HSN Details</th>
                                    </tr>
                                </thead>
                            </table>
                            <Collapse bordered={false} expandIcon={({ isActive }) => <CaretRightOutlined rotate={isActive ? 90 : 0} />} className="collapse-gst-tbl">
                                <Collapse.Panel>
                                    <table className="pdp-tbl"  >
                                        <thead>
                                            <tr>
                                                <th style={{ color: "black", background: "white" }} >Goods</th>
                                            </tr>
                                        </thead>
                                    </table>
                                    <Collapse bordered={false} expandIcon={({ isActive }) => <CaretRightOutlined rotate={isActive ? 90 : 0} style={{ color: "black" }} />} className="collapse-gst-tbl">
                                        <Collapse.Panel>
                                            <table className="gst-tbl">
                                                <tbody>
                                                    <thead>
                                                        <tr>
                                                            <th>HSN Code</th>
                                                            <th>HSN Description</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {
                                                            data?.hsnDetails?.goods?.map((item) => (
                                                                <tr>
                                                                    <td style={{ width: "14%" }}>{item.hsnCode}</td>
                                                                    <td>{item.hsnDescription}</td>
                                                                </tr>
                                                            ))}
                                                    </tbody>
                                                </tbody>
                                            </table>
                                        </Collapse.Panel>
                                    </Collapse>
                                    <table className="pdp-tbl"  >
                                        <thead>
                                            <tr>
                                                <th style={{ color: "black", background: "white" }} >Services</th>
                                            </tr>
                                        </thead>
                                    </table>
                                    <Collapse bordered={false} expandIcon={({ isActive }) => <CaretRightOutlined rotate={isActive ? 90 : 0} style={{ color: "black" }} />} className="collapse-gst-tbl">
                                        <Collapse.Panel>
                                            <table className="gst-tbl">
                                                <tbody>
                                                    <thead>
                                                        <tr>
                                                            <th>HSN Code</th>
                                                            <th>HSN Description</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {
                                                            data?.hsnDetails?.services?.map((item) => (
                                                                <tr>
                                                                    <td style={{ width: "1%" }}>{item.hsnCode}</td>
                                                                    <td style={{ width: "9%" }}>{item.hsnDescription}</td>
                                                                </tr>
                                                            ))}
                                                    </tbody>
                                                </tbody>
                                            </table>
                                        </Collapse.Panel>
                                    </Collapse>
                                </Collapse.Panel>
                            </Collapse>
                            <table className="pdp-tbl"  >
                                <thead>
                                    <tr>
                                        <th style={{ width: '27%' }} >Branch Details</th>
                                    </tr>
                                </thead>
                            </table>
                            <Collapse bordered={false} expandIcon={({ isActive }) => <CaretRightOutlined rotate={isActive ? 90 : 0} />} className="collapse-gst-tbl">
                                <Collapse.Panel>
                                    <table className="pdp-tbl"  >
                                        <thead>
                                            <tr>
                                                <th style={{ color: "black", background: "white" }} >Principal Address</th>
                                            </tr>
                                        </thead>
                                    </table>
                                    <Collapse bordered={false} expandIcon={({ isActive }) => <CaretRightOutlined rotate={isActive ? 90 : 0} style={{ color: "black" }} />} className="collapse-gst-tbl">
                                        <Collapse.Panel>
                                            <table className="gst-tbl">
                                                <tbody>
                                                    <thead>
                                                        <tr>
                                                            <th>Address</th>
                                                            <th>Nature Of Business</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        <tr>
                                                            <td style={{ width: "50%" }}>{data?.branchDetails?.principalAddress?.address}</td>
                                                            <td>{data?.branchDetails?.principalAddress?.natureOfBusiness}</td>
                                                        </tr>
                                                    </tbody>
                                                </tbody>
                                            </table>
                                        </Collapse.Panel>
                                    </Collapse>
                                    <table className="pdp-tbl"  >
                                        <thead>
                                            <tr>
                                                <th style={{ color: "black", background: "white" }} >Additional Addresses</th>
                                            </tr>
                                        </thead>
                                    </table>
                                    <Collapse bordered={false} expandIcon={({ isActive }) => <CaretRightOutlined rotate={isActive ? 90 : 0} style={{ color: "black" }} />} className="collapse-gst-tbl">
                                        <Collapse.Panel>
                                            <table className="gst-tbl">
                                                <tbody>
                                                    <thead>
                                                        <tr>
                                                            <th>HSN Code</th>
                                                            <th>HSN Description</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {
                                                            data?.branchDetails?.additionalAddresses?.map((item) => (
                                                                <tr>
                                                                    <td style={{ width: "50%" }}>{item.address}</td>
                                                                    <td>{item.natureOfBusiness}</td>
                                                                </tr>
                                                            ))}
                                                    </tbody>
                                                </tbody>
                                            </table>
                                        </Collapse.Panel>
                                    </Collapse>
                                </Collapse.Panel>
                            </Collapse>
                            <table className="pdp-tbl"  >
                                <thead>
                                    <tr>
                                        <th style={{ width: '27%' }} >Filing Details</th>
                                    </tr>
                                </thead>
                            </table>
                            <Collapse bordered={false} expandIcon={({ isActive }) => <CaretRightOutlined rotate={isActive ? 90 : 0} />} className="collapse-pdp-tbl">
                                <Collapse.Panel>
                                    <table className="gst-tbl">
                                        <tbody>
                                            <thead>
                                                <tr>
                                                    <th>Fin Year</th>
                                                    <th>Return Type</th>
                                                    <th>Return Period</th>
                                                    <th>Mode Of Filing</th>
                                                    <th>Date Of Filing</th>

                                                </tr>
                                            </thead>
                                            <tbody>
                                                {
                                                    data?.filingDetails?.filingStatus?.map((item) => (
                                                        item.map((i) => (
                                                            <tr>
                                                                <td style={{ width: "7%" }}>{i.finYear}</td>
                                                                <td style={{ width: "7%" }}>{i.returnType}</td>
                                                                <td style={{ width: "7%" }}>{i.returnPeriod}</td>
                                                                <td style={{ width: "7%" }}>{i.modeOfFiling}</td>
                                                                <td style={{ width: "7%" }}>{i.dateOfFiling}</td>
                                                            </tr>
                                                        ))))
                                                }
                                            </tbody>
                                        </tbody>
                                    </table>
                                </Collapse.Panel>
                            </Collapse>
                            <table className="pdp-tbl"  >
                                <thead>
                                    <tr>
                                        <th style={{ width: '27%' }} >Liability Paid Details</th>
                                    </tr>
                                </thead>
                            </table>
                            <Collapse bordered={false} expandIcon={({ isActive }) => <CaretRightOutlined rotate={isActive ? 90 : 0} />} className="collapse-gst-tbl">
                                <Collapse.Panel>
                                    <div style={{ display: "block" }}>
                                        <div className='liab-dtls'><span>Current FinYear:</span> <span>{data?.liabilityPaidDetails?.currFinYear}</span></div>
                                        <div className='liab-dtls'><span>Previous FinYear:</span> <span>{data?.liabilityPaidDetails?.prevFinYear}</span></div>
                                        <div className='liab-dtls'><span>Previous TotalPct:</span> <span>{data?.liabilityPaidDetails?.prevTotalPct}</span></div>
                                    </div>

                                    <table className="pdp-tbl"  >
                                        <thead>
                                            <tr>
                                                <th style={{ color: "black", background: "white" }} >Current Details</th>
                                            </tr>
                                        </thead>
                                    </table>
                                    <Collapse bordered={false} expandIcon={({ isActive }) => <CaretRightOutlined rotate={isActive ? 90 : 0} style={{ color: "black" }} />} className="collapse-gst-tbl">
                                        <Collapse.Panel>
                                            <table className="gst-tbl">
                                                <tbody>
                                                    <thead>
                                                        <tr>
                                                            <th>Period</th>
                                                            <th>Liab PaidPct</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {
                                                            data?.liabilityPaidDetails?.currDetails?.map((item) => (
                                                                <tr>
                                                                    <td style={{ width: "5%" }}>{item.period}</td>
                                                                    <td style={{ width: "5%" }}>{item.liabPaidPct}</td>
                                                                </tr>
                                                            ))}
                                                    </tbody>
                                                </tbody>
                                            </table>
                                        </Collapse.Panel>
                                    </Collapse>
                                    <table className="pdp-tbl"  >
                                        <thead>
                                            <tr>
                                                <th style={{ color: "black", background: "white" }} >Previous Details</th>
                                            </tr>
                                        </thead>
                                    </table>
                                    <Collapse bordered={false} expandIcon={({ isActive }) => <CaretRightOutlined rotate={isActive ? 90 : 0} style={{ color: "black" }} />} className="collapse-gst-tbl">
                                        <Collapse.Panel>
                                            <table className="gst-tbl">
                                                <tbody>
                                                    <thead>
                                                        <tr>
                                                            <th>Period</th>
                                                            <th>Liab PaidPct</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {
                                                            data?.liabilityPaidDetails?.prevDetails?.map((item) => (
                                                                <tr>
                                                                    <td style={{ width: "5%" }}>{item.period}</td>
                                                                    <td style={{ width: "5%" }}>{item.liabPaidPct}</td>
                                                                </tr>
                                                            ))}
                                                    </tbody>
                                                </tbody>
                                            </table>
                                        </Collapse.Panel>
                                    </Collapse>
                                </Collapse.Panel>
                            </Collapse>
                            </div>
                    }
                    </Loader>
                </div>
            </div>

        </>

    )
}
// const mapStateToProps = (state) => {
//   return {

//   }
// }
const mapDispatchToProps = (dispatch) => {
    return {
        cleartaxPanDetails: (datas) => dispatch(AdminActions.cleartaxPanDetails(datas)),
    }
}
const ConnectPOData = connect(
    null,
    mapDispatchToProps,
)(Finance);

export default ConnectPOData;

