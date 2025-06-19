import React, { useEffect, useState } from 'react';
import { Modal, Radio, Select, notification } from 'antd';
import Util from '../../../util/helper/index';
import { connect } from 'react-redux';
import '../CfaDepot/cfadepo.css';
import LocalAuth from '../../../util/middleware/auth'
import { pages, hasEditPermission } from '../../../persona/moq.js';
import Moqcss  from '../MoqDashboard/MoqDashboard.module.css';

import * as Action from '../actions/adminAction';

import _, { get, set } from "lodash";


const { Option } = Select;

function BulkOrderModal(props) {
    const {
        cfaData,
        onHide,
        visible,
        onUpdate,
        isUpdate,
        updateMultiple: isMultiUpdate,
        view: isView,
        region,
        cfaDatas,
        areaDetails,
        getBoAreaZone
    } = props;

   
    const division = [14];
    const [data, setData] = useState([]);

    const [isAdd, setIsAdd] = useState(false);
    const [zoneOptions, setZoneOptions] = useState([]);
    const [filterDetails,setFilterDetails]= useState();
    const [regions,setRegions]=useState();
    const [areaCodes,setAreaCodes]=useState();
    const [selectedRegions,setSelectedRegions]=useState();
    const [selectedArea,setSelectedArea]=useState();
    const [regionId, setRegionId] = useState();
    const [quantity, setQuantity] = useState();
    useEffect(() => {
        setData(cfaData);
    }, [cfaData]);


// use this useEffect for no dependency array 

useEffect(()=>{
getBoAreaZone().then((res)=>{
 
   if(res.success){
  
         let region_id = res.data.map((item)=>item.regions_id);
         setFilterDetails(areaDetails.filter((item)=>region_id.includes(item.region_id)));
         
         const regions = new Set();
         areaDetails?.forEach(item => {
             if(region_id.includes(item.region_id)){
                 regions.add(item.region);
               
             }
         })
     
         setRegions([...regions]);
        }
})
},[]);

    useEffect(() => {
        const mappedZones = _.uniq(cfaDatas?.map(item => item.region_id) ?? []);
        const zoneSet = new Set();
        areaDetails?.forEach(obj => {
            if (mappedZones.includes(obj.region_id))
                zoneSet.add(obj.region);
        })
        setZoneOptions([...zoneSet]);
    }, [cfaDatas, areaDetails]);

    useEffect(() => {
        setIsAdd((!isUpdate && !isMultiUpdate && !isView))
    }, [isUpdate, isMultiUpdate, isView])

    const handleCancel = () => {
        onHide();
        setAreaCodes();
        setRegions();
    };

  


  

    function mandatoryMarker() {
        return <span className="mandatory-mark"><b>*</b></span>
    }

    const setAreaCode = (value) => {
        setSelectedRegions(value);
        let area=[];
        let regionId=[];
        
        filterDetails?.forEach((item) => {
            if(value.includes(item.region)){
               
             
                area.push(item.area_code);
                regionId.push(item.region_id);
                // setAreaCodes([new Set([...areaCodes,...area])]);

            }
        })
      
        setAreaCodes([...new Set([...area])]);
        setRegionId([...new Set([...regionId])]);
    }
   
    const formatValue = (value) => {
        console.log('ValueLength',value.length);
        //check if value is number, else return 0, also check if the value is within range of 0-100, if less than 0 then return 0, if greater than 100 then return 100
        if (isNaN(value)) {
            return '0';
        }  
        // else if (value.length>1&&value < 30) {
        //     return '';
        // }
      
        else {
            return value.toString();
        }
    }


    const changeQuantity = (value) => {
        let formattedValue = formatValue(value);
        setQuantity(formattedValue);
       
    }


    const payloadCreate = (e) => {
        e.preventDefault();
        let payload = {
            area: selectedArea,
            quantity: quantity,
            region_id: regionId
        }
        onUpdate(payload);
    }


    return (
        <Modal
            title="Bulk Order Multiple Update"
            visible={visible}
            className='cfa-depot-modal'
            onCancel={handleCancel}
            width={'60%'}
            footer={null}>
            <form action=''>
                <div className="basic-details basic-cfa-details">
                    {isMultiUpdate &&
                        <div id='zone-depot-code' className={isUpdate ? 'basic-details form-wrapper' : 'basic-details form-wrap'}>
                          
                            <br />
                            <label>
                                Region
                                {mandatoryMarker()}
                            </label>
                            <Select
                                mode="multiple"
                                allowClear
                                className="basic-details"
                                showSearch
                                placeholder="Select a region"
                                value={selectedRegions}
                                onChange={(value) => setAreaCode(value)}
                            >
                                {
                                    regions?.sort()?.map((data) => {
                                        return <Option key={data} value={data}>{data}</Option>;
                                    }
                                    )}
                           
                            </Select>

                         
                            
                            <label>
                                Area
                                { mandatoryMarker()}    
                            </label>
                            <Select
                            mode="multiple"
                            allowClear
                            className="basic-details"
                            showSearch
                            placeholder="Select a area"
                            value={selectedArea}
                            onChange={(value) => setSelectedArea(value)}
                        >
                            {
                                areaCodes?.sort()?.map((data) => {
                                    return <Option key={data} value={data}>{data}</Option>;
                                }
                                )}
                           
                        </Select>
                        
                            
                        </div>
                    }
               
                    <div id='division' className={isUpdate ? 'basic-details form-wrapper' : 'basic-details form-wrap'}>
                        <label>Division</label>
                        {isUpdate ? (
                            <span>{data?.division}</span>
                        ) : (
                            <Select
                                mode="multiple"
                                allowClear
                                style={{
                                    width: '100%',
                                }}
                                value={data?.division === 0 ? [] : data?.division}
                              
                                placeholder="Please select"
                                getPopupContainer={() => document.getElementById('division')}
                                defaultValue={[14]}
                            >
                                {division?.map((data) => {
                                    return <Option key={data} value={data}>{data}</Option>;
                                })}
                            </Select>
                        )}
                    </div>

               
               {/* Updated Quantity */}


               <div className={isView ? 'form-wrapper' : 'form-wrap'}>
                        <label>Updated Quantity
                            {(isAdd || isUpdate || isMultiUpdate) && mandatoryMarker()}
                        </label>
                        {isView ? (
                            <span>{data?.remarks}</span>
                        ) : (
                            <input
                             
                                value={quantity}
                                onChange={(e) => changeQuantity(e.target.value)}
                                type='number'
                                min={30}
                                max={100}
                                step={1.0}
                                placeholder={'Enter quantity'}
                                className={`form-control ${Moqcss.qunatity_update}`}
                             
                            />
                        )}
                    </div>


                   
                    {/* <span className={Moqcss.quantity_flag_color}>{`[Please set minimum quantity 30 tons]`}</span> */}
                    {/* Status */}
            

                    {/* Submit Button */}
                    {!isView && hasEditPermission(pages.BULKMOQ) &&
                        <button
                            disabled={(!selectedArea || (selectedArea?.length===0))||(!selectedRegions || (selectedRegions?.length===0))||!quantity}
                            className="submit-btn"
                            onClick={(e)=>payloadCreate(e)}
                            style={{ marginTop: '30px' }}
                          >
                            Update
                        </button>}
                </div>

            </form>
        </Modal>
    );
}



const mapDispatchToProps = (dispatch) => {
    return {
        getBoAreaZone:()=>dispatch(Action.getBoAreaZone())
    }
}

export default connect(null, mapDispatchToProps)(BulkOrderModal)
