import React from "react";
import { StyledSearchInput } from "./style";

const SearchInput = (props) => {
    const { data } = props;

    return (
        <>
            <StyledSearchInput list="material-search" />
            <datalist id="material-search">
                {
                    data.map((item, index) => <option value={item} key={index} />)
                }
            </datalist>
        </>
    );
}

export default SearchInput; 
