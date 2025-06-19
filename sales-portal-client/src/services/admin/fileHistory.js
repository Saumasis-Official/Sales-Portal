import React, { useEffect, useState, useRef } from 'react';
import { connect } from 'react-redux';
import * as Action from './actions/adminAction';
import Util from '../../../src/util/helper/index';
import Panigantion from '../../components/Panigantion';
import debounce from 'lodash.debounce';
import { SearchOutlined, CloudUploadOutlined } from '@ant-design/icons';
import { Modal, notification, Select, Input, Button, AutoComplete } from 'antd';
import { Upload } from 'antd';
import '../../style/admin/Dashboard.css';
import './TSEDistributorModal/TSEDistributorModal.css';
import './fileHistory.css'
import SearchBox from '../../components/SearchBox';
const { Dragger } = Upload;


let FileHistory = (props) => {
    const { getFileUploadHistory, file_upload_history, updateFileStatus, uploadFile, getAzureADUserData } = props
    const [search, setSearch] = useState('');
    const [showSearch, setShowSearch] = useState('');
    const [offset, setOffset] = useState(0);
    const [limit, setLimit] = useState(10);
    const [fileHistory, setFileHistory] = useState([]);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [rowCount, setRowCount] = useState();
    const debouncedSearch = useRef(debounce(nextValue => setSearch(nextValue), 300)).current;
    const { Option } = Select;
    const [status, setStatus] = useState("");
    const [statusChange, setStatusChange] = useState(false);
    const [isModalVisible, setIsModalVisible] = useState(false);

    const [file, setFile] = useState();
    const [description1, setDescription1] = useState()
    const [title, setTitile] = useState();
    const [name, setName] = useState();
    const [email, setEmail] = useState();
    const [contact, setContact] = useState();
    const [category, setCategory] = useState();
    const aRef = useRef(null);
    const [emailList, setEmailList] = useState();
    const [searchText, setSearchText] = useState('');
    const [originalEmailList, setOriginalEmailList] = useState([]);
    const [isSearchByTitleEnabled, setIsSearchByTitleEnabled] = useState(false);
    const [isSearchByUploadedByEnabled, setIsSearchByUploadedByEnabled] = useState(false);
    const [searchField, setSearchField] = useState('');
    const [fileArray, setFileArray] = useState([]);
    const phoneRegExp = /^(\+\d{1,3}[- ]?)?\d{10}$/;
    const emailRegExp = /^[\w-\.]+@(tataconsumer+\.)+(com)$/;



    useEffect(() => {
        const response = getFileUploadHistory({ offset, limit, search, searchField }).then(async (res) => {
            if (res && res.data && res.data.data && res?.data?.data?.rows.length > 0) {
                setRowCount(res.data?.data?.totalCount)

                await setFileHistory(res?.data?.data?.rows)

                res.data.data.rows.map((data) => {
                    document.getElementById(data.id).disabled = true;
                })

            }


        })

    }, [fileHistory && fileHistory.length, search, offset, limit]);

    const selectStatusHandler = (id, value) => {
        document.getElementById(id).disabled = false;
        setStatusChange(true);
        setStatus(value);
    }

    const saveStatusChanges = async (history_id) => {
        const data = {
            status: status,
            id: history_id
        }
        const res = await updateFileStatus(data)
        if (res && res.success) {
            notification.success({
                message: 'Success',
                description: 'File status updated succesfully !!',
                duration: 2,
                className: 'notification-green',
            });
            getFileUploadHistory({ offset, limit, search, searchField })
            setStatusChange(false);
            document.getElementById(history_id).disabled = true;

        } else {
            notification.error({
                message: 'Error',
                description: `Failed to update file status`,
                duration: 5,
                className: 'notification-error',
            })
            getFileUploadHistory({ offset, limit, search, searchField })
            document.getElementById(history_id).disabled = true;
        }
    }

    const onSch = (value) => {
        debouncedSearch(value);
        setShowSearch(value);
        setOffset(0)
        setLimit(itemsPerPage)
    }

    const resetPage = () => {
        debouncedSearch('');
        setShowSearch('');
        setSearchField('');
        setOffset(0);
    }

    const onChangePage = (page, itemsPerPage) => {
        setLimit(itemsPerPage)
        setOffset((page - 1) * limit)
    }


    const handleFileChange = (e) => {
        if (e.target.files) {
            setFile(e.target.files);
        }
    }

    const handleTextAreaChange = (e) => {
        if (e.target) {
            setDescription1(e.target.value);
        }
    }

    const handleTitleChange = (e) => {
        if (e.target) {
            setTitile(e.target.value);
        }
    }

    const handleNameChange = (e) => {
        if (e.target) {
            setName(e.target.value);
        }
    }

    const handleEmailChange = async (value) => {
        value = value + '';
        setEmailList([]);
        setEmail(value);
        if (value.length >= 3) {
            if (searchText !== '' && value.startsWith(searchText)) {
                let el = [...originalEmailList].filter(u => u.value.toLowerCase().startsWith(value.toLowerCase()));
                setEmailList([...el]);
            }
            else {
                setSearchText(value);
                let response = await props.getAzureADUserData(value);
                if (response.success && response.data.length > 0) {
                    let el = [...response.data].map(u => { return { value: u.email } });
                    setEmailList(el);
                    setOriginalEmailList(el);
                }
            }
        } else {
            setSearchText('');
        }

    }

    const openSearchByTitle = () => {
        setIsSearchByUploadedByEnabled(false);
        resetPage();
        setIsSearchByTitleEnabled(true);
        setSearchField('title')
    }

    const openSearchByUploadedBy = () => {
        setIsSearchByTitleEnabled(false);
        resetPage();
        setIsSearchByUploadedByEnabled(true);
        setSearchField('uploaded_by');
    }

    const handleContactChange = (e) => {
        if (e.target) {
            setContact(e.target.value);
        }
    }

    const handleModal = (e) => {
        setIsModalVisible(true)
    }

    const closeModal = async () => {
        await handleReset();
        setIsModalVisible(false)
    }

    const handleCategory = (value) => {
        setCategory(value);
    }

    const closeSearchBox = () => {
        setIsSearchByTitleEnabled(false);
        setIsSearchByUploadedByEnabled(false);
        resetPage();

    }

    const handleReset = () => {
        if (file) {
            file.length = 0
        }
        setFile([]);
        setCategory("");
        setContact("");
        setDescription1("");
        setEmail("");
        setTitile("");
        setName("");
        aRef.current = null;
    }
    const handleFileUpload = async () => {
        if (!file && !(name && contact && email)) {
            notification.error({
                message: 'Error',
                description: 'Either upload the file or Provide the contact person details',
                duration: 2,
                className: 'notification-error',
            });
            return;
        }
        if (!file && (!name || !contact || !email)) {
            notification.error({
                message: 'Error',
                description: 'If file is not there name, contact, email is mandetory',
                duration: 2,
                className: 'notification-error',
            });
            return;
        }
        if (!title || !description1 || !category) {
            notification.error({
                message: 'Error',
                description: 'Title, Description, category field should not be empty',
                duration: 2,
                className: 'notification-error',
            });
            return;
        }
        if (contact && !phoneRegExp.test(contact.toString())) {
            notification.error({
                message: 'Error',
                description: 'Please Enter valid Contact details',
                duration: 2,
                className: 'notification-error',
            });
            return;
        }

        if (email && !emailRegExp.test(email.toString())) {
            notification.error({
                message: 'Error',
                description: 'Enter Valid Email',
                duration: 2,
                className: 'notification-error',
            });
            return;
        }
        const userName = localStorage.getItem('SSOUserName')
        let data = new FormData();
        if (file && file.length) {
            for (let i = 0; i < file.length; i++) {
                data.append(`file`, file[i].originFileObj);
            }
        }
        data.append('description', description1);
        data.append('userName', userName);
        data.append('contactName', name);
        data.append('title', title);
        data.append('email', email);
        data.append('contact', contact);
        data.append('category', category);
        await uploadFile(data).then((res) => {
            if (res && res.data && res.data.success) {
                handleReset();
                notification.success({
                    message: 'Success',
                    description: 'File uploaded successfully !!',
                    duration: 2,
                    className: 'notification-green',
                });
            } else {
                if (res?.data?.message == 'FILE_ALREADY_EXIST') {
                    notification.error({
                        message: 'Error',
                        description: 'File Already Exist',
                        duration: 2,
                        className: 'notification-error',
                    });
                    handleReset();
                    return;
                }
                notification.error({
                    message: 'Error',
                    description: 'Failed to upload the file',
                    duration: 2,
                    className: 'notification-error',
                });
                handleReset();
                return;
            }

        })
        const response = getFileUploadHistory({ offset, limit, search, searchField }).then(async (res) => {
            if (res && res.data && res.data.data && res?.data?.data?.rows.length > 0) {
                setRowCount(res.data?.data?.totalCount)
                await setFileHistory(res?.data?.data?.rows)

                res.data.data.rows.map((data) => {
                    document.getElementById(data.id).disabled = true;
                })

            }

        })
        setIsModalVisible(false)
    }

    const handleChange = (fileList) => {
        setFile(fileList.fileList)
    };

    const params = {
        beforeUpload: false,
        onChange: handleChange,
        multiple: true,
        file,

    };
    const handleRemove = file => {
        setFile(prevFileList => prevFileList.filter(f => f.name !== file.name));
    };
    return (
        <>
            <div className="admin-dashboard-wrapper">
                <div className="admin-dashboard-block">
                    <div className="admin-dashboard-head">
                        <h2>Help Section Records</h2>
                        <div className='purchase-order-block2'>
                            <button
                                onClick={handleModal}
                                className="add-button"
                            >
                                Add Article
                                <img src="/assets/images/plus-icon.svg" alt="" />
                            </button>
                        </div>
                    </div>
                    <div className="admin-dashboard-table">
                        <table>
                            <thead>
                                <tr>
                                    {isSearchByTitleEnabled ? <th className="width150" >
                                        <SearchBox onReset={closeSearchBox} onSearchChange={onSch} />
                                    </th> :
                                        <th >Title <SearchOutlined onClick={openSearchByTitle} /> </th>
                                    }
                                    <th >Category</th>
                                    {isSearchByUploadedByEnabled ? <th>
                                        <SearchBox onReset={closeSearchBox} onSearchChange={onSch} />
                                    </th> :
                                        <th>Uploaded By <SearchOutlined onClick={openSearchByUploadedBy} /> </th>
                                    }
                                    <th>Description</th>
                                    <th>Created On</th>
                                    <th>Status</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {file_upload_history.data?.rows?.map((item, i) => {
                                    return (
                                        <tr key={i}>
                                            <td className="width150">{item.title}</td>
                                            <td>{item.category}</td>
                                            <td>{item.uploaded_by}</td>
                                            <td>{item.description}</td>
                                            <td>{item.uploaded_on
                                                ? Util.formatDate(item.uploaded_on)
                                                : '-'}</td>
                                            <td className="width10">
                                                <Select defaultValue={item.status} onChange={(value) => selectStatusHandler(item.id, value)} className='help-category-select' dropdownClassName="help-category-dropdown">
                                                    <Option value="ACTIVE"> Active </Option>
                                                    <Option value="INACTIVE">Inactive</Option>
                                                </Select>

                                            </td>
                                            <td className='admin-ations width10'>{
                                                <button id={item.id} className='btn' onClick={() => saveStatusChanges(item.id)}>Save</button>
                                            }

                                            </td>
                                        </tr>

                                    )


                                })}
                            </tbody>
                            {file_upload_history?.data?.rows?.length === 0 &&
                                <tr style={{ textAlign: 'center' }}>
                                    <td colSpan="7">No Data available</td>
                                </tr>}
                        </table>
                    </div>
                    <Panigantion
                        data={fileHistory ? fileHistory : []}
                        itemsPerPage={itemsPerPage}
                        setItemsPerPage={setItemsPerPage}
                        itemsCount={rowCount}
                        setModifiedData={onChangePage}
                    />
                </div>
            </div>

            <Modal bodyStyle={{ boxShadow: 'inherit' }} width={500} title="Upload File" visible={isModalVisible} wrapClassName='comment-modal' onCancel={closeModal} footer={null} >
                <div className="comment-fld hello" >
                    <div className='category'>
                        <label htmlFor="name">Category *</label>
                        <Select value={category} onChange={(value) => handleCategory(value)} className="form-wrapper select-category" placeholder='Select catergory'>
                            <Option disabled> Select Category </Option>
                            <Option value="FAQ"> FAQ </Option>
                            <Option value="SOP">SOP</Option>
                        </Select>
                    </div>
                    <div className="form-wrapper">
                        <label htmlFor="title">Title *</label>
                        <Input value={title} onChange={handleTitleChange} id='title' type="text" placeholder='Enter the title here' />
                    </div>
                    <div className="comment-fld">
                        <label htmlFor="description">Description *</label>
                        <textarea value={description1} name="description" id="description" cols="30" rows="10" onChange={handleTextAreaChange} placeholder='Enter description here'></textarea>
                    </div>
                    <div className='dragger-container'>
                        <Dragger onRemove={handleRemove} ref={aRef} {...params} beforeUpload={() => {
                            return false;
                        }}>
                            <p className="ant-upload-drag-icon">
                                <CloudUploadOutlined />
                            </p>
                            <p className="ant-upload-text">Click or drag file to this area to upload File</p>
                            <p className="ant-upload-hint">
                                Help Section Data File Upload
                            </p>
                        </Dragger>
                    </div>

                    <div className="comment-fld">
                        <label htmlFor="name">Name</label>
                        <Input value={name} onChange={handleNameChange} id='name' type="text" placeholder='Enter contact person name here' />
                    </div>

                    <div className="comment-fld">
                        <label htmlFor="contact">Contact</label>
                        <Input value={contact} onChange={handleContactChange} id='contact' type="number" placeholder='Enter contact person phone number here' />
                    </div>
                    <div className="comment-fld">
                        <label htmlFor="email">Email</label>
                        <div>
                            <AutoComplete
                                className="form-control file-upload-email"
                                options={emailList}
                                placeholder="Enter contact person email id here"
                                value={email}
                                onChange={(value) => handleEmailChange(value)}
                                filterOption={(inputValue, option) =>
                                    option.value.toUpperCase().indexOf(inputValue.toUpperCase()) !== -1
                                }
                            />
                        </div>
                    </div>
                    <div className="form-wrapper upload-btn">
                        <Button onClick={handleFileUpload} type="primary">Save</Button>
                    </div>
                </div>
            </Modal>
        </>
    )
}





const mapStateToProps = (state) => {
    return {
        file_upload_history: state.admin.get('file_upload_history'),
    };
};
const mapDispatchToProps = (dispatch) => {
    return {
        getFileUploadHistory: ({ offset, limit, search, searchField }) => dispatch(Action.getFileUploadHistory({ offset, limit, search, searchField })),
        updateFileStatus: (data, history_id) => dispatch(Action.updateFileStatus(data, history_id)),
        getAzureADUserData: (search_text) => dispatch(Action.getAzureADUserData(search_text)),
        uploadFile: (file) =>
            dispatch(Action.uploadFile(file))

    };
}

const connectFileHistory = connect(
    mapStateToProps,
    mapDispatchToProps,
)(FileHistory);


export default connectFileHistory;


