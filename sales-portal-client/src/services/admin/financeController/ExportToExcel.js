import React, { useState, useEffect } from 'react';
import ReactExport from 'react-data-export';
import Util from '../../../util/helper';

const ExportToExcel = (props) => {
  const ExcelFile = ReactExport.ExcelFile;
  const ExcelSheet = ReactExport.ExcelFile.ExcelSheet;
  const ExcelColumn = ReactExport.ExcelFile.ExcelColumn;

  const { data, onCancel } = props;
  const [excelData, setExcelData] = useState([]);

  useEffect(() => {
    const formattedData = data?.map((item) => ({
      distributorId: item.distributor_id,
      distributorName: item.distributor_name,
      city: item.city,
      tseCode: item.tse_code,
      areaCode: item.area_code,
      agreementStatus: item.agreement_status,
      dateTime: `${Util.formatDate(
        item.created_at,
      )} ${Util.formatTime(item.created_at)}`,
    }));

    setExcelData(formattedData);
  }, [data]);

  const handleDownload = () => {
    props.onDownload();
  };

  return (
    <>
      {excelData && excelData.length > 0 && (
        <div>
          <ExcelFile
            filename={`Distributor_Agreements_${
              new Date().toISOString().split('T')[0]
            }`}
            element={
              <button
                onClick={() => {
                  handleDownload();
                  onCancel();
                }}
              >
                Download
              </button>
            }
          >
            <ExcelSheet data={excelData} name="Sheet1">
              <ExcelColumn
                label="Distributor ID"
                value="distributorId"
              />
              <ExcelColumn
                label="Distributor Name"
                value="distributorName"
              />
              <ExcelColumn label="City" value="city" />
              <ExcelColumn label="TSE Code" value="tseCode" />
              <ExcelColumn label="Area Code" value="areaCode" />
              <ExcelColumn
                label="Consent Status"
                value="agreementStatus"
              />
              <ExcelColumn label="Response Date" value="dateTime" />
            </ExcelSheet>
          </ExcelFile>
        </div>
      )}
    </>
  );
};

export default ExportToExcel;
