import React from "react";
import PageTitle from "../../layouts/PageTitle";
import KycTable from "./components/KycTable";
import { adminMetrics } from "../../data/adminData";
import StatCard from "./components/StatCard";
import { SVGICON } from "../../constant/theme";

const KycAll = () => {
  const summary = [
    {
      label: "KYC Submitted",
      value: adminMetrics.kycSubmitted,
      icon: SVGICON.FormIconSvg,
      color: "primary",
    },
    {
      label: "KYC Pending",
      value: adminMetrics.kycPending,
      icon: SVGICON.CallIcon,
      color: "warning",
    },
    {
      label: "KYC Approved",
      value: adminMetrics.kycApproved,
      icon: SVGICON.MessageIcon,
      color: "success",
    },
    {
      label: "KYC Rejected",
      value: adminMetrics.kycRejected,
      icon: SVGICON.SettingIcon,
      color: "danger",
    },
  ];

  return (
    <>
      <PageTitle motherMenu="KYC" activeMenu="All KYC" />
      <div className="row g-3 mb-3">
        {summary.map((item) => (
          <div className="col-md-3" key={item.label}>
            <StatCard
              title={item.label}
              value={item.value}
              icon={item.icon}
              color={item.color}
            />
          </div>
        ))}
      </div>
      <KycTable title="All KYC Activities" />
    </>
  );
};

export default KycAll;
