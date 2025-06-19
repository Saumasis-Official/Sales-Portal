import React from 'react';
import { Modal, Button } from 'antd';

const DeclarationModal = ({ visible, onAgree, onDisagree }) => {
  return (
    <Modal
      title="Declaration / No Objection Certificate"
      visible={visible}
      closable={false} 
      className='declaration-modal'
      footer={[
        <Button key="disagree" onClick={onDisagree}>
          I Disagree
        </Button>,
        <Button key="agree" type="primary" onClick={onAgree}>
          I Agree
        </Button>,
      ]}
      style={{ top: 30 }}
    >
      <div className="document-container">
        <p className="document-text">Date:</p>
        <p className="document-text">To,</p>
        <p className="document-text">
          Tata Consumer Products Limited
        </p>
        <p className="document-text">
          Address:– Kirloskar Business Park, Block C
        </p>
        <p className="document-text">3rd and 4th Floors, Hebbal</p>
        <p className="document-text">Bengaluru 560024</p>
        <p className="document-text">
          Subject: Declaration / No Objection Certificate
        </p>
        <p className="document-text">To Whomsoever It May Concern</p>
        <p className="document-text">
          I ______________________, proprietor/partner/director of
          ____________________________, having our office at
          _______________________________ hereby solemnly confirm and
          affirm that:
        </p>
        <p className="document-text">
          I am engaged with your organization as a Distributor bearing
          no.________ (if any) since __________ .
        </p>
        <p className="document-text">
          I hereby declare that I have no objection in Tata Consumer
          Products Limited sharing my KYC documents (PAN no., Aadhar
          Card no. and Bank Details) with the third party named{' '}
          <b>M/s Accountmein Fintech Solutions Pvt. Ltd.</b> a company
          duly incorporated under the Companies Act, 2013 bearing
          Corporate Identity Number U72900HR2021PTC095894 and having
          its office at Plot no. 48, 4th Floor, Sector -44, Gurgaon
          -122003, for the purpose of transfer of the Payouts to me
          from TCPL.
        </p>
        <p className="document-text">
          Further, I have permitted and it is hereby affirmed that I
          interpose no objection for my KYC documents being used for
          the said purposes. We understand that our KYC documents will
          be stored and accessed by TCPL and Accountmein Fintech
          during the course of my engagement with TCPL.
        </p>
        <p className="document-text">
          I understand that TCPL does not have access or visibility of
          the data privacy policy of Accountmein Fintech and as such,
          TCPL shall not be liable for any data breaches by
          Accountmein, whether affecting my KYC documents or not.
        </p>
        <p className="document-text">
          I_____________, hereby declare that I am signing this
          declaration in my absolute sense and consciousness without
          any coercion or pressure from anyone in the Company.
        </p>
        <p className="document-text">Name: (Signature)</p>
        <p className="document-text">Address:</p>
        <p className="document-text">Date:</p>
        <p className="document-text">Place:</p>
      </div>
    </Modal>
  );
};

export default DeclarationModal;
