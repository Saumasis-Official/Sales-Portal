import { Button, Divider, Typography } from "@material-ui/core";
import styled from "styled-components";

const Table = styled.table`
    border-collapse: collapse;
    width: 100%;
`;

export const Th = styled.th`
    font: normal normal 600 14px/14px Myriad Pro;
    letter-spacing: 0px;
    color: #FFFFFFDE;
    // border: 1px solid #ddd;
    padding: 8px;
    padding-top: 12px;
    padding-bottom: 12px;
    text-align: left;  
    background-color: #1268B3;
    opacity: 1;
`;

export const Td = styled.td`
    // border: 1px solid #ddd;
    padding: 5px;
    .search-input {
        padding-top: 2px;
        padding-bottom: 2px;
    }
`;

export const Tr = styled.tr`
    &:nth-child(even){
        background-color: #f2f2f2;
    }
    &:hover {
        background-color: #ddd;
    }
`;

export const InputImage = styled.input`
    width: 30%;
`;

export const AddButton = styled.input`
    width: 3%;
    margin-left: 97%;
`;

export const Input = styled.input`
    width: 100%;
    height: 29px;
    background: #FFFFFF 0% 0% no-repeat padding-box;
    border: 1px solid #E8E9EC;
    border-radius: 3px;
    padding-left: 9px;
`;

// SearchInput CSS
export const StyledSearchInput = styled.input`
    width: 100%;
    height: 29px;
    padding-left: 9px;
    background: #FFFFFF 0% 0% no-repeat padding-box;
    border: 1px solid #E8E9EC;
    border-radius: 3px;
`;

// DialogBox CSS
export const StyledDivider = styled(Divider)`
    width: 92%;
    margin-left: 3%;
`;

export const CancelButton = styled(Button)`
    width: 20%;
    margin-right: 3%;
    text-transform: none;
    font: normal normal 600 17px/25px Myriad Pro;
    letter-spacing: 0.03px;
    color: #8D8D8D;
    opacity: 1;
`;

export const ProceedButton = styled(Button)`
    width: 20%;
    text-transform: none;
    font: normal normal 600 17px/25px Myriad Pro;
    letter-spacing: 0.03px;
    color: #FFFFFF;
    opacity: 1;
`;

export const StyledTypography = styled(Typography)`
    font: normal normal normal 16px/16px Myriad Pro;
    letter-spacing: 0px;
    color: #333333;
`;

export default Table;
