import React, { useState, useEffect } from "react";
import { Select } from 'antd';
import './Paginator.css';
import useWindowDimensions from '../../hooks/useWindowDimensions';
const { Option } = Select;

const Paginator = (props) => {
    const { width } = useWindowDimensions();
    const { itemsCount, setModifiedData, itemsPerPage, setItemsPerPage ,pageNo,goToPage=null, disabled} = props;


    const [page, setPage] = useState(1);

    let totalPages = itemsCount / itemsPerPage;
    totalPages = Number.isInteger(totalPages) ? totalPages : parseInt(totalPages) + 1;

    const handleItemsPerPageChange = (val) => {
        setItemsPerPage(val);
        setPage(1);
    };

    const handlePageChange = (val) => {
        setPage(val);
    };

    const onClickPreviousPage = () => {
        const previousPage = parseInt(page) - 1;
        setPage(previousPage);
    };

    const onClickNextPage = () => {
        const nextPage = parseInt(page) + 1;
        setPage(nextPage);
    };

    useEffect(()=>{
        if(pageNo){
            setPage(pageNo);
        }
    },[pageNo]);

    useEffect(() => {
        setModifiedData(page, itemsPerPage)
    }, [page, itemsPerPage]);

    useEffect(() => {
        goToPage && setPage(goToPage);
    },[goToPage]);

    const range = (start, end) => {
        return Array(end - start + 1).fill().map((_, idx) => start + idx)
    };

    return (
        <>
         {width > 767 ?
            <div className="pagination">
                <label>Items per pages:</label>
                <div className="page-select">
                    <Select aria-label="Items Per Page" style={{ width: 65 }} defaultValue="10" onChange={handleItemsPerPageChange} disabled={disabled}>
                        <Option value="10">
                            10</Option>
                        <Option value="20">20</Option>
                        <Option value="30">30</Option>
                        <Option value="40">40</Option>
                        <Option value="50">50</Option>
                        <Option value="100">100</Option>
                        <Option value="200">200</Option>
                    </Select>
                </div>
                <div className="vl"></div>
                <label>{itemsCount ? ((itemsPerPage * (page - 1)) + 1) : 0} – {((itemsPerPage * page) > itemsCount) ? itemsCount : (itemsPerPage * page)} of {itemsCount} items</label>
                <div className="page-right">
                    {totalPages ?
                        <div className="page-select">
                            <Select aria-label="Page Change" disabled= {disabled} style={{ width: 65 }} defaultValue={goToPage? goToPage?.toString() : '1'} value={page} onChange={handlePageChange}>
                                {[...range(1, totalPages)].map((page, i) => {
                                    return (
                                        <Option value={page.toString()} key={i}>{page}</Option>
                                    );
                                })}
                            </Select>
                        </div> : ''}
                    <label> {totalPages ? ' of ' : ''} {isNaN(totalPages) ? 0 : totalPages} pages</label>
                    <button 
                        disabled={disabled || page === 1 || !itemsCount} 
                        onClick={onClickPreviousPage}
                        aria-label="Previous Page"
                    >
                        <img src="/assets/images/carret--left.svg" alt="" />
                    </button>
                    <button 
                        disabled={disabled || page === totalPages || !itemsCount} 
                        onClick={onClickNextPage}
                        aria-label="Next Page"
                    >
                        <img src="/assets/images/carret--right.svg" alt="" />
                    </button>
                </div>
            </div>
            :
            <div className="pagination-mob">
                <label className="label1">Items per page:</label>
                <div className="page-select-mob">
                    <Select aria-label="Items Per Page" style={{ width: 52 }} defaultValue="10" onChange={handleItemsPerPageChange} disabled={disabled}>
                        <Option value="10">10</Option>
                        <Option value="20">20</Option>
                        <Option value="30">30</Option>
                        <Option value="40">40</Option>
                        <Option value="50">50</Option>
                        <Option value="100">100</Option>
                        <Option value="200">200</Option>
                    </Select>
                </div>
                <label className="label2">
                    {itemsCount ? ((itemsPerPage * (page - 1)) + 1) : 0} – {((itemsPerPage * page) > itemsCount) ? itemsCount : (itemsPerPage * page)} of {itemsCount} items
                </label>
                <div className="page-right-mob">
                    {totalPages ?
                        <div className="page-select-mob">
                            <Select aria-label="Page Change"  
                                disabled= {disabled} 
                                style={{ width: 52 }} 
                                defaultValue={goToPage? goToPage?.toString() : '1'} 
                                value={page} onChange={handlePageChange}>
                                {[...range(1, totalPages)].map((page, i) => {
                                    return (
                                        <Option value={page.toString()} key={i}>{page}</Option>
                                    );
                                })}
                            </Select>
                        </div> : ''}
                    <label className="label2"> {totalPages ? ' of ' : ''} {isNaN(totalPages) ? 0 : totalPages} pages</label>
                    <button 
                        disabled={disabled || page === 1 || !itemsCount} 
                        onClick={onClickPreviousPage}
                        aria-label="Previous Page"
                    >
                        <img src="/assets/images/carret--left.svg" alt="" />
                    </button>
                    <button 
                        disabled={disabled || page === totalPages || !itemsCount} 
                        onClick={onClickNextPage}
                        aria-label="Next Page"
                    >
                        <img src="/assets/images/carret--right.svg" alt="" />
                    </button>
                </div>
            </div>
         }
            
        </>
    );
}

export default Paginator;
