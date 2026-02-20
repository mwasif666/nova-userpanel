import React from "react";
import PageTitle from "../../layouts/PageTitle";
import KycTable from "./components/KycTable";

const KycPending = () => {
  return (
    <>
      <PageTitle motherMenu="KYC" activeMenu="Pending KYC" />
      <KycTable title="Pending KYC" statusFilter="Pending" />
    </>
  );
};

export default KycPending;
