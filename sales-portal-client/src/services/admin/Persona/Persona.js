import { React } from "react";
import { Table } from 'antd';
import './Persona.css';
import { personaUIRef, pegasus } from "../../../persona/pegasus";
import { roles } from "../../../persona/roles";
import { ArrowLeftOutlined, DownloadOutlined } from '@ant-design/icons';
import Util from "../../../util/helper";
import { Link } from "react-router-dom";
import XLSX from 'xlsx';
import _ from "lodash";

const rolesData = {};

function mapRoles() {
    let roleTeamMap = [];
    Object.values(roles).forEach(r => (
        roleTeamMap.push({
            role: r,
            team: Object.keys(pegasus).find(k => pegasus[k].includes(r))
        })))
    roleTeamMap = _.sortBy(roleTeamMap, ['team', 'role']);
    roleTeamMap.forEach((item) => { 
        rolesData[item.role] = {
            key: item.role,
            roles: item.role,
            teams: item.team
        }
    });
};

function mapTableHeaders(data) {
    const roleCol = {
        title: 'Roles',
        dataIndex: 'roles',
        key: 'roles',
        fixed: "left",
        width: 200
    }
    const teamsCol = {
        title: 'Teams',
        dataIndex: 'teams',
        key: 'teams',
        fixed: "left",
        width: 150
    }
    const dataMap = Object.keys(data).map((item) => {
        return dataTree(data[item], item, "COL");
    });
    return [roleCol, teamsCol, ...dataMap];
};

function dataTree(data, key, keyIndex) {
    const newKeyIndex = `${keyIndex}#${key}`;
    if (Object.keys(data).some(k => typeof data[k] !== 'object')) {
        Object.keys(rolesData)?.forEach(d => {
            rolesData[d] = {
                ...rolesData[d],
                [newKeyIndex]: data.includes(d),
            }
        })
        return {
            title: Util.toTitleCase(key.replace(/_/g, ' ')),
            dataIndex: newKeyIndex,
            accessTo: data,
            width: 100,
            render: (text, record) => text ?
                <div className="persona-check-box persona-check-box-checked">Y</div> :
                <div className="persona-check-box persona-check-box-unchecked">N</div>
        }
    }
    return {
        title: Util.toTitleCase(key.replace(/_/g, ' ')),
        dataIndex: newKeyIndex,
        ellipsis: true,
        children: Object.keys(data).map(k => dataTree(data[k], k, `${newKeyIndex}`))
    }
}

function Persona(props) {
    mapRoles();
    const personaDataColumns = mapTableHeaders(personaUIRef);
    const download = () => {
        var wb = XLSX.utils.table_to_book(document.getElementById('persona-table-grid'));
        XLSX.writeFile(wb, 'persona.xlsx');
        return false;
    };
    return (
        <div className="admin-dashboard-wrapper">
            <div className="admin-dashboard-block">
                <header className="admin-dashboard-head" id='admin-dashboard-head'>
                    <div class="persona-page-title">
                        <h2>Persona</h2>
                    </div>
                    <button
                        onClick={download}
                        className="persona-download-button">
                        Download<DownloadOutlined />
                    </button>
                    <Link to="/admin/user-management">
                        <ArrowLeftOutlined />
                        <em>Back To User Management</em></Link>
                </header>
                <div className="persona-table">
                    <Table
                        id="persona-table-grid"
                        columns={personaDataColumns}
                        dataSource={Object.values(rolesData)}
                        bordered
                        size="small"
                        scroll={{ x: 'calc(700px + 50%)', y: '60vh' }}
                        pagination={false}
                    />
                </div>
            </div>
        </div>
    );
}

export default Persona;