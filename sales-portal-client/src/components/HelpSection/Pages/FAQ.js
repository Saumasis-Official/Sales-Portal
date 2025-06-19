import React from "react";
import { Collapse } from 'antd';
import '../index.css'
import { useEffect } from "react";
import * as Action from '../../../services/admin/actions/adminAction'
import { useState } from "react";
import { connect } from 'react-redux';
import Panigantion from '../../Panigantion'
import { Tooltip, Card } from 'antd';
import { useRef } from "react";
import { width } from "@material-ui/system";
const { Meta } = Card;
const { Panel } = Collapse;

//FAQ section tab.
function FaqTab(props) {

  const { fetchHelpSectionData, get_help_section_data, getPreAssignedUrl } = props;
  const [limit, setLimit] = useState(10);
  const [offset, setOffset] = useState(0);
  const [helpSectionData, setHelpSectionData] = useState([]);
  const [category, setCategory] = useState('FAQ');
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const onChange = (key) => {
  };

  useEffect(() => {
    const handleContextmenu = e => {
      e.preventDefault()
    }
  }, [])

  useEffect(async () => {
    await fetchHelpSectionData({ limit, offset, category });

  }, [helpSectionData, limit, offset, category])

  const onChangePage = (page, itemsPerPage) => {
    setLimit(itemsPerPage)
    setOffset((page - 1) * limit)
  }

  const fileCount = (data, fileType) => {
    let count = 0;
    data?.file_path?.forEach(element => {
      if (element.split('.')[1] === fileType) { count++; }
    });
    return count;
  }

  const resetPage = () => {
  }

  const handleClick = (i, file) => {
    getPreAssignedUrl(file).then(url => {
      if (url && url.data.data.url) {
        document.getElementById(i).style.display = 'block'
        let a = document.getElementById(i).src = url?.data?.data?.url
        if (!url?.data?.data?.url?.includes('.mp4')) {
          downloadFile(url?.data?.data?.url)
          document.getElementById(i).style.display = 'none'
        }
      }
    })
  }

  const downloadFile = (url) => {
    window.location.href = url
  }

  return (
    <div className="FirstTab">
      <Collapse onChange={onChange}>

        {get_help_section_data?.data?.response?.rows?.map((data, i) => {
          return (
            <Panel header={data?.title} key={i} style={{ fontWeight: '500', fontSize: '15px', width: '100%', margin: 'auto' }}  >
              <div>
                <p>{data?.description}</p>
                <div>
                  {data?.file_path?.length > 0 ? <h4>Attached Help Decuments</h4> : ''}
                </div >
                {fileCount(data, 'mp4') <= 0 ?
                  <></> :
                  <div className="videos-con" >
                    {data?.file_path?.map((file, j) => {
                      return (
                        <div className="video-container">
                          {file.split('.')[1] == 'mp4' ? <Tooltip placement="top" title={'Click here to play video'}>
                            <div className="video-card" onClick={() => handleClick(i, file)}>
                              <Card
                                hoverable
                                style={{ width: 110, height: 140 }}
                                className='vid-card'
                              >
                                {<img style={{ width: 60 }} className='images' alt="img not available" src="/assets/images/video.svg" />}
                                <Meta style={{ marginTop: 20, display: 'flex', justifyContent: 'center' }} title={file} />
                              </Card>
                            </div>
                          </Tooltip> : ''}
                        </div>
                      )
                    })}

                  </div>
                }
                <video className="video-panel" onContextMenu={e => e.preventDefault()} id={i} style={{ height: '200px', width: '400px', margin: '20px', display: 'none' }} src='' controls autoplay="autoplay" controlsList="nodownload"> </video>

                {fileCount(data, 'pdf') <= 0 ?
                  <></> :
                  <div className="videos-con" >
                    {data?.file_path?.map((file, j) => {
                      return (
                        <div className="video-container" >
                          {file.split('.')[1] == 'pdf' ? <Tooltip placement="top" title={'Click here to download the file'}>
                            <div className="video-card" onClick={() => handleClick(i, file)}>
                              <Card
                                hoverable
                                style={{ width: 110, height: 140, display: 'block', textAlign: 'center' }}
                                className='vid-card'
                              >
                                {<img style={{ width: 60 }} className='images' alt="img not available" src="/assets/images/Frame 68.svg" />}
                                <Meta style={{ marginTop: 5, display: 'flex', justifyContent: 'center' }} title={file} />
                              </Card>
                            </div>
                          </Tooltip> : ''}
                        </div>
                      )
                    })}
                  </div>
                }

                {fileCount(data, 'pptx') <= 0 ?
                  <></> :
                  <div className="videos-con">
                    {data?.file_path?.map((file, j) => {
                      return (
                        <div className="video-container" >
                          {(file.split('.')[1] == 'pptx' || file.split('.')[1] == 'ppt') ? <Tooltip placement="top" title={'Click here to download the file'}>
                            <div className="video-card" onClick={() => handleClick(i, file)}>
                              <Card
                                hoverable
                                style={{width: 110, height: 140}}
                                className='vid-card'
                              >
                                {<img style={{ width: 100 }} className='images' alt="img not available" src="/assets/images/ppt.svg" />}
                                <Meta style={{ marginTop: 20, display: 'flex', justifyContent: 'center' }} title={file} />
                              </Card>
                            </div>
                          </Tooltip> : ''}
                        </div>
                      )
                    })}
                  </div>
                }

                {fileCount(data, 'ppt') <= 0 ?
                  <></> :
                  <div className="videos-con">
                    {data?.file_path?.map((file, j) => {
                      return (
                        <div className="video-container" >
                          {(file.split('.')[1] == 'ppt') ? <Tooltip placement="top" title={'Click here to download the file'}>
                            <div className="video-card" onClick={() => handleClick(i, file)}>
                              <Card
                                hoverable
                                style={{ width: 110, height: 140 }}
                                className='vid-card'
                              >
                                {<img style={{ width: 100 }} className='images' alt="img not available" src="/assets/images/ppt.svg" />}
                                <Meta style={{ marginTop: 20, display: 'flex', justifyContent: 'center' }} title={file} />
                              </Card>
                            </div>
                          </Tooltip> : ''}
                        </div>
                      )
                    })}
                  </div>
                }

                {fileCount(data, 'docx') <= 0 ?
                  <></> :
                  <div className="videos-con">
                    {data?.file_path?.map((file, j) => {
                      return (
                        <div className="video-container" >
                          {(file.split('.')[1] == 'docx') ? <Tooltip placement="top" title={'Click here to download the file'}>
                            <div className="video-card" onClick={() => handleClick(i, file)}>
                              <Card
                                hoverable
                                style={{ width: 110, height: 140 }}
                                className='vid-card'
                              >
                                {<img style={{ width: 100 }} className='images' alt="img not available" src="/assets/images/Vector (1).svg" />}
                                <Meta style={{ marginTop: 20, display: 'flex', justifyContent: 'center' }} title={file} />
                              </Card>
                            </div>
                          </Tooltip> : ''}
                        </div>
                      )
                    })}
                  </div>
                }

                {fileCount(data, 'doc') <= 0 ?
                  <></> :
                  <div className="videos-con">
                    {data?.file_path?.map((file, j) => {
                      return (
                        <div className="video-container" >
                          {(file.split('.')[1] == 'doc') ? <Tooltip placement="top" title={'Click here to download the file'}>
                            <div className="video-card" onClick={() => handleClick(i, file)}>
                              <Card
                                hoverable
                                style={{width: 110, height: 140 }}
                                className='vid-card'
                              >
                                {<img style={{ width: 100 }} className='images' alt="img not available" src="/assets/images/Vector (1).svg" />}
                                <Meta style={{ marginTop: 20, display: 'flex', justifyContent: 'center' }} title={file} />
                              </Card>
                            </div>
                          </Tooltip> : ''}
                        </div>
                      )
                    })}
                  </div>
                }

                {fileCount(data, 'xlsx') <= 0 ?
                  <></> :
                  <div className="videos-con">
                    {data?.file_path?.map((file, j) => {
                      return (
                        <div className="video-container" >
                          {file.split('.')[1] == 'xlsx' || file.split('.')[1] == 'csv' ? <Tooltip placement="top" title={'Click here to download the file'}>
                            <div className="video-card" onClick={() => handleClick(i, file)}>
                              <Card
                                hoverable
                                style={{ width: 110, height: 140 }}
                                className='vid-card'
                              >
                                {<img style={{ width: 100 }} className='images' alt="img not available" src="/assets/images/excel 1.svg" />}
                                <Meta style={{ marginTop: 20, display: 'flex', justifyContent: 'center' }} title={file} />
                              </Card>
                            </div>
                          </Tooltip> : ''}
                        </div>
                      )
                    })}
                  </div>
                }
                {fileCount(data, 'csv') <= 0 ?
                  <></> :
                  <div className="videos-con">
                    {data?.file_path?.map((file, j) => {
                      return (
                        <div className="video-container" >
                          {file.split('.')[1] == 'csv' ? <Tooltip placement="top" title={'Click here to download the file'}>
                            <div className="video-card" onClick={() => handleClick(i, file)}>
                              <Card
                                hoverable
                                style={{ width: 110, height: 140}}
                                className='vid-card'
                              >
                                {<img style={{ width: 100 }} className='images' alt="img not available" src="/assets/images/excel 1.svg" />}
                                <Meta style={{ marginTop: 20, display: 'flex', justifyContent: 'center' }} title={file} />
                              </Card>
                            </div>
                          </Tooltip> : ''}
                        </div>
                      )
                    })}
                  </div>
                }
                {
                  (data && data.contact_name && data.contact_number && data.email) ? <div className='contact-container'>
                    <div style={{ fontSize: '1.2rem' }} >Contact Person Details</div>
                    <di style={{ fontWeight: 'normal' }} >Name: {(data.contact_name == 'undefined') ? '' : data.contact_name}</di>
                    <div style={{ fontWeight: 'normal' }}>Contact: {data.contact_number == 'undefined' ? '' : data.contact_number}</div>
                    <div style={{ fontWeight: 'normal' }}>Email: {data.email == 'undefined' ? '' : data.email}</div>
                  </div> : ''
                }
              </div>
            </Panel>

          )
        })}
      </Collapse>
      <Panigantion
        data={get_help_section_data ? get_help_section_data : []}
        itemsPerPage={itemsPerPage}
        setItemsPerPage={setItemsPerPage}
        itemsCount={get_help_section_data?.data?.totalCount}
        setModifiedData={onChangePage}
      />
    </div >

  )
}

const mapStateToProps = (state) => {
  return {
    get_help_section_data: state.admin.get('get_help_section_data'),
  };
};
const mapDispatchToProps = (dispatch) => {
  return {
    fetchHelpSectionData: ({ offset, limit, category }) => dispatch(Action.fetchHelpSectionData({ offset, limit, category })),
    getPreAssignedUrl: (path) => dispatch(Action.getPreAssignedUrl(path)),
  };
}

const connectFAQ = connect(
  mapStateToProps,
  mapDispatchToProps,
)(FaqTab);

export default connectFAQ;