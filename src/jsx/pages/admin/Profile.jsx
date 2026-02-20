import React, { useCallback, useEffect, useState } from "react";
import ReactApexChart from "react-apexcharts";
import PageTitle from "../../layouts/PageTitle";
import { adminMetrics } from "../../data/adminData";
import { request } from "../../../utils/api";
import KycOverviewCard from "./components/KycOverviewCard";

const formatDateTime = (value) => {
  if (!value) return "N/A";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "N/A";
  return date.toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
};

const Profile = () => {
  const [profile, setProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(true);

  const getProfile = useCallback(async () => {
    setProfileLoading(true);
    try {
      const res = await request({
        url: "me",
        method: "GET",
      });
      const user = res?.data?.user ?? res?.data ?? null;
      setProfile(user);
    } catch (error) {
      console.error(error);
      setProfile(null);
    } finally {
      setProfileLoading(false);
    }
  }, []);

  useEffect(() => {
    getProfile();
  }, [getProfile]);

  const user = profile || {};
  const account = user.account || {};
  const displayName = user.name || "N/A";
  const role = user.role || "N/A";
  const email = user.email || "N/A";
  const phone = user.phone || "N/A";
  const location = account.address || account.domain || "N/A";
  const joinedAt = formatDateTime(user.created_at);
  const updatedAt = formatDateTime(user.updated_at);
  const accessLevel = user.permissions
    ? Object.values(user.permissions).every(Boolean)
      ? "Full Access"
      : "Limited Access"
    : "N/A";

  const initials = displayName
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const kycSeries = [
    adminMetrics.kycApproved,
    adminMetrics.kycPending,
    adminMetrics.kycRejected,
  ];

  const kycOptions = {
    chart: {
      type: "donut",
      height: 220,
    },
    labels: ["Approved", "Pending", "Rejected"],
    colors: ["#2a6587", "#f59e0b", "#ef4444"],
    dataLabels: { enabled: false },
    stroke: { width: 0 },
    legend: { show: false },
    plotOptions: {
      pie: {
        donut: {
          size: "72%",
        },
      },
    },
    tooltip: {
      y: {
        formatter: (value) => value.toLocaleString(),
      },
    },
  };

  const quickStats = [
    { label: "Total Subscribers", value: adminMetrics.totalSubscribers },
    { label: "KYC Pending", value: adminMetrics.kycPending },
    { label: "Today Transactions", value: adminMetrics.todayTransactions },
    { label: "Monthly Transactions", value: adminMetrics.monthlyTransactions },
  ];

  const responsibilities = [
    { label: "KYC escalations", value: `${adminMetrics.kycPending} pending` },
    {
      label: "Risk review queue",
      value: `${adminMetrics.kycRejected} flagged`,
    },
    {
      label: "Monthly audit",
      value: `${adminMetrics.monthlyTransactions} txns`,
    },
  ];

  const preferences = [
    "Weekly executive report",
    "Security alerts",
    "KYC SLA reminders",
    "Transaction anomaly digest",
  ];

  return (
    <>
      <PageTitle motherMenu="Profile" activeMenu="Admin Profile" />
      <div className="row g-3">
        <div className="col-xl-12">
          <div className="card nova-panel nova-profile-card">
            <div className="card-body">
              <div className="nova-profile-hero">
                <div className="nova-profile-meta">
                  <div className="nova-profile-avatar">{initials || "NA"}</div>
                  <div>
                    <h3 className="mb-1">
                      {profileLoading ? "Loading..." : displayName}
                    </h3>
                    <div className="nova-profile-badges">
                      <span className="nova-profile-chip">{role}</span>
                      <span className="nova-profile-sub">
                        {account.name || "Operations HQ"}
                      </span>
                    </div>
                  </div>
                </div>
                {/* <div className="nova-profile-actions">
                  <Button label="Edit Profile" icon="pi pi-pencil" />
                  <Button
                    label="Reset Password"
                    icon="pi pi-lock"
                    className="p-button-secondary"
                  />
                </div> */}
              </div>

              <div className="nova-profile-contact-grid">
                <div className="nova-profile-contact">
                  <span>Email</span>
                  <p>{email}</p>
                </div>
                <div className="nova-profile-contact">
                  <span>Phone</span>
                  <p>{phone}</p>
                </div>
                <div className="nova-profile-contact">
                  <span>Location</span>
                  <p>{location}</p>
                </div>
              </div>

              <div className="nova-profile-divider" />

              <div className="nova-profile-grid">
                <div>
                  <span className="nova-stat-label">Name</span>
                  <h5 className="mb-0">{displayName}</h5>
                </div>
                <div>
                  <span className="nova-stat-label">Role</span>
                  <h5 className="mb-0">{role}</h5>
                </div>
                <div>
                  <span className="nova-stat-label">Email</span>
                  <h5 className="mb-0">{email}</h5>
                </div>
                <div>
                  <span className="nova-stat-label">Phone</span>
                  <h5 className="mb-0">{phone}</h5>
                </div>
                <div>
                  <span className="nova-stat-label">Location</span>
                  <h5 className="mb-0">{location}</h5>
                </div>
                <div>
                  <span className="nova-stat-label">Joined</span>
                  <h5 className="mb-0">{joinedAt}</h5>
                </div>
                <div>
                  <span className="nova-stat-label">Updated At</span>
                  <h5 className="mb-0">{updatedAt}</h5>
                </div>
                <div>
                  <span className="nova-stat-label">Access Level</span>
                  <h5 className="mb-0">{accessLevel}</h5>
                </div>
                <div>
                  <span className="nova-stat-label">Status</span>
                  <h5 className="mb-0">
                    {user.is_active ? "Active" : "Inactive"}
                  </h5>
                </div>
              </div>
            </div>
          </div>
        </div>
        {/* <div className="col-xl-4">
          <div className="card nova-panel">
            <div className="card-body">
              <h4 className="mb-3">Performance Snapshot</h4>
              <div className="nova-profile-stat-grid">
                {quickStats.map((stat) => (
                  <div className="nova-profile-stat" key={stat.label}>
                    <span>{stat.label}</span>
                    <h4>{stat.value.toLocaleString()}</h4>
                  </div>
                ))}
              </div>
              <div className="nova-profile-cta">
                <Button label="Export Report" icon="pi pi-download" className="p-button-secondary" />
                <Button label="New Audit" icon="pi pi-plus" />
              </div>
            </div>
          </div>
        </div> */}
      </div>

      <div className="row g-3 mt-1">
        <div className="col-xl-7">
          <KycOverviewCard updatedAt={updatedAt} />
        </div>
        <div className="col-xl-5">
          <div className="card nova-panel">
            <div className="card-body">
              <h4 className="mb-3">Security & Access</h4>
              <div className="nova-profile-list">
                <div className="nova-profile-list-row">
                  <span>Two-factor authentication</span>
                  <strong>
                    {user.two_factor_enabled ? "Enabled" : "Disabled"}
                  </strong>
                </div>
                <div className="nova-profile-list-row">
                  <span>Email verified</span>
                  <strong>
                    {user.email_verified_at
                      ? formatDateTime(user.email_verified_at)
                      : "Not verified"}
                  </strong>
                </div>
                <div className="nova-profile-list-row">
                  <span>Account status</span>
                  <strong>{user.is_active ? "Active" : "Inactive"}</strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="row g-3 mt-1">
        <div className="col-xl-6">
          <div className="card nova-panel">
            <div className="card-body">
              <h4 className="mb-3">Key Responsibilities</h4>
              <div className="nova-profile-list">
                {responsibilities.map((item) => (
                  <div className="nova-profile-list-row" key={item.label}>
                    <span>{item.label}</span>
                    <strong>{item.value}</strong>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        <div className="col-xl-6">
          <div className="card nova-panel">
            <div className="card-body">
              <h4 className="mb-3">Notification Preferences</h4>
              <div className="nova-profile-tags">
                {preferences.map((item) => (
                  <span className="nova-profile-chip" key={item}>
                    {item}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Profile;
