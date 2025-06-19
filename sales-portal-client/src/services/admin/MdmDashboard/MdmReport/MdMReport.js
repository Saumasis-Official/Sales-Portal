import React, { useState } from 'react'
import Panigantion from '../../../../components/Panigantion';
import { ArrowLeftOutlined } from '@ant-design/icons'
import { Link } from 'react-router-dom';  

function MdMReport() {
    const DummyMdmData=[1,2,3,3,1,21,21,31]
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const onChangePage = (page, itemsPerPage) => {
    }
    
    const SelectAll=()=>{
    
    }
  return (
    <React.Fragment>
        <div className="admin-dashboard-wrapper">
        <div className="admin-dashboard-block"> 
        <div className="admin-dashboard-head Mdm-Header" >
          <h2><b>SKU Data Reports</b> </h2> 
          <h3><Link to="admin/mdm-dashboard" ><ArrowLeftOutlined className='mdm-noti-icon'/></Link></h3>
        </div>  
        <div className='admin-dashboard-table Mdm-TableHeader'>
          <table className='MdmReport'>
            <thead>
               <tr>
                   <th className="width12" >Request No</th>
                   <th className="width20" >Notification Sent</th>
                   <th className="width15" >Status</th>
                   <th className="width20" >Request Date</th>
                   <th className="width12" >Aging in days</th>
             </tr>
            </thead>
              <tbody>
              {DummyMdmData&&DummyMdmData?.length>0
             &&(DummyMdmData.map((DummyMdmData)=> {
              return(
               <tr> 
                <td>{'testing'}</td>
                <td>{'testing'} </td>
                <td>{'testing'} </td>
                <td>{'testing' } </td>
                <td>{'testing'} </td>
               </tr>
              )
              })
              )}
            </tbody>
          </table>
            {!(DummyMdmData?.length > 0) && (<div className='NoDataDiv'>
                <b> No data available</b>
              </div>)}
       </div>
          <Panigantion
             data={DummyMdmData?.length?DummyMdmData.length:[]}
             itemsPerPage={10}
             setItemsPerPage={setItemsPerPage}
             itemsCount={5}
             setModifiedData={onChangePage}
             pageNo={2}
          />
        </div>
        </div>
    </React.Fragment>
  )
}

export default MdMReport
