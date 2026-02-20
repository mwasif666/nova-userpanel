import React from "react";
import PageTitle from "../../layouts/PageTitle";
import KycTable from "./components/KycTable";

const KycRejected = () => {
  return (
    <>
      <PageTitle motherMenu="KYC" activeMenu="Rejected KYC" />
      <KycTable title="Rejected KYC" statusFilter="Rejected" />
    </>
  );
};

export default KycRejected;
