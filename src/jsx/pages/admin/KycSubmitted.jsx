import React from "react";
import PageTitle from "../../layouts/PageTitle";
import KycTable from "./components/KycTable";

const KycSubmitted = () => {
  return (
    <>
      <PageTitle motherMenu="KYC" activeMenu="Submitted KYC" />
      <KycTable
        title="Submitted KYC"
        statusFilter="Submitted"
        allowSimulate
      />
    </>
  );
};

export default KycSubmitted;
