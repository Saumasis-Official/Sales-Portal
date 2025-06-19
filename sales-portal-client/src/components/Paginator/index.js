import React, { useState, useEffect } from "react";
import { Select } from 'antd';
import './Paginator.css';
const { Option } = Select;

const Paginator = (props) => {
    const { data, itemsCount, itemsPerPage, setItemsPerPage } = props;

    const [page, setPage] = useState(1);

    useEffect(() => {
        const startItemIndex = 0;
        const endItemIndex = (itemsPerPage * page > itemsCount) ? itemsCount : (itemsPerPage * page);
        const formattedData = data.slice(startItemIndex, endItemIndex);
        props.setModifiedData(formattedData);
    }, []);

    let totalPages = itemsCount / itemsPerPage;
    totalPages = Number.isInteger(totalPages) ? totalPages : parseInt(totalPages) + 1;

    const handleItemsPerPageChange = (val) => {
        setItemsPerPage(val);
        setPage(1);
        const startItemIndex = 0;
        const endItemIndex = ((val * 1) > itemsCount) ? itemsCount : (val * 1);
        const formattedData = data.slice(startItemIndex, endItemIndex);
        props.setModifiedData(formattedData);
    };

    const handlePageChange = (val) => {
        setPage(val);
        const startItemIndex = itemsPerPage * (val - 1);
        const endItemIndex = ((itemsPerPage * val) > itemsCount) ? itemsCount : (itemsPerPage * val);
        const formattedData = data.slice(startItemIndex, endItemIndex);
        props.setModifiedData(formattedData);
    };

    const onClickPreviousPage = () => {
        const previousPage = parseInt(page) - 1;
        if (page > 1) setPage(previousPage);
        const startItemIndex = itemsPerPage * (previousPage - 1);
        const endItemIndex = ((itemsPerPage * previousPage) > itemsCount) ? itemsCount : (itemsPerPage * previousPage);
        const formattedData = data.slice(startItemIndex, endItemIndex);
        props.setModifiedData(formattedData);
    };

    const onClickNextPage = () => {
        const nextPage = parseInt(page) + 1;
        if (page < totalPages) setPage(nextPage);
        const startItemIndex = itemsPerPage * (nextPage - 1);
        const endItemIndex = ((itemsPerPage * nextPage) > itemsCount) ? itemsCount : (itemsPerPage * nextPage);
        const formattedData = data.slice(startItemIndex, endItemIndex);
        props.setModifiedData(formattedData);
    };

    const range = (start, end) => {
        return Array(end - start + 1).fill().map((_, idx) => start + idx)
    };

    return (
        <>
            <div className="pagination">
                <label>Items per pages:</label>
                <div className="page-select">
                    <Select style={{ width: 65 }} defaultValue="10" onChange={handleItemsPerPageChange}>
                        <Option value="10">
                            10</Option>
                        <Option value="20">20</Option>
                        <Option value="30">30</Option>
                        <Option value="40">40</Option>
                        <Option value="50">50</Option>
                    </Select>
                </div>
                <div className="vl"></div>
                <label>{itemsCount ? ((itemsPerPage * (page - 1)) + 1) : 0} – {((itemsPerPage * page) > itemsCount) ? itemsCount : (itemsPerPage * page)} of {itemsCount} items</label>
                <div className="page-right">
                    {totalPages ?
                        <div className="page-select">
                            <Select style={{ width: 65 }} defaultValue="1" value={page} onChange={handlePageChange}>
                                {[...range(1, totalPages)].map((page, i) => {
                                    return (
                                        <Option value={page.toString()} key={i}>{page}</Option>
                                    );
                                })}
                            </Select>
                        </div> : ''}
                    <label> {totalPages ? ' of ' : ''} {isNaN(totalPages) ? 0 : totalPages} pages</label>
                    <button 
                        disabled={page === 1 || !itemsCount} 
                        onClick={onClickPreviousPage}
                        aria-label="Previous Page"
                    >
                        <img src="/assets/images/carret--left.svg" alt="" />
                    </button>
                    <button 
                        disabled={page === totalPages || !itemsCount} 
                        onClick={onClickNextPage}
                        aria-label="Next Page"
                    >
                        <img src="/assets/images/carret--right.svg" alt="" />
                    </button>
                </div>
            </div>
        </>
    );
}

export default Paginator;
