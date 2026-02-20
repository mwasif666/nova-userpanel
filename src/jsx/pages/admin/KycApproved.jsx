import React from "react";
import PageTitle from "../../layouts/PageTitle";
import KycTable from "./components/KycTable";

const KycApproved = () => {
  return (
    <>
      <PageTitle motherMenu="KYC" activeMenu="Approved KYC" />
      <KycTable title="Approved KYC" statusFilter="Approved" />
    </>
  );
};

export default KycApproved;
