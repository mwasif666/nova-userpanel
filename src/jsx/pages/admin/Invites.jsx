import React from "react";
import PageTitle from "../../layouts/PageTitle";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { Tag } from "primereact/tag";
import { InputText } from "primereact/inputtext";
import { Dropdown } from "primereact/dropdown";
import { Calendar } from "primereact/calendar";
import { InputNumber } from "primereact/inputnumber";
import { invites } from "../../data/adminData";
import { SVGICON } from "../../constant/theme";
import StatCard from "./components/StatCard";
import { getStatusSeverity } from "./components/statusUtils";
import { filterByDatePreset } from "./components/dateUtils";

const Invites = () => {
  const [globalFilterValue, setGlobalFilterValue] = React.useState("");
  const [inviterSearch, setInviterSearch] = React.useState("");
  const [datePreset, setDatePreset] = React.useState("monthly");
  const [dateRange, setDateRange] = React.useState(null);
  const [rewardTiers, setRewardTiers] = React.useState([
    { min: 0, max: 2, label: "Starter", amount: 10 },
    { min: 3, max: 5, label: "Growth", amount: 15 },
    { min: 6, max: null, label: "Elite", amount: 20 },
  ]);
  const [rewardOverrides, setRewardOverrides] = React.useState({});

  const filteredInvites = React.useMemo(
    () => filterByDatePreset(invites, "date", datePreset, dateRange),
    [datePreset, dateRange],
  );

  const isAcceptedStatus = (status) => {
    const normalized = String(status || "").toLowerCase();
    return normalized === "joined" || normalized === "accepted";
  };

  const statusTemplate = (rowData) => (
    <Tag value={rowData.status} severity={getStatusSeverity(rowData.status)} />
  );

  const renderPerson = (name, email) => (
    <div>
      <div className="fw-semibold">{name || "N/A"}</div>
      <div className="text-muted small">{email || "N/A"}</div>
    </div>
  );

  const formatInviteeList = (list) => {
    if (!Array.isArray(list) || list.length === 0) return "N/A";
    if (list.length <= 2) return list.join(", ");
    return `${list.slice(0, 2).join(", ")} +${list.length - 2} more`;
  };

  const sortedTiers = React.useMemo(
    () => [...rewardTiers].sort((a, b) => b.min - a.min),
    [rewardTiers],
  );

  const getTierForAccepted = (accepted) => {
    const match = sortedTiers.find((tier) => accepted >= tier.min);
    return match || sortedTiers[sortedTiers.length - 1] || rewardTiers[0];
  };

  const inviterStats = React.useMemo(() => {
    const map = new Map();

    filteredInvites.forEach((invite) => {
      const inviter = invite.inviter || "Unknown";
      const record = map.get(inviter) || {
        inviter,
        inviterEmail: invite.inviterEmail || "",
        total: 0,
        accepted: 0,
        pending: 0,
        acceptedInvitees: [],
        pendingInvitees: [],
        acceptedInviteesText: "",
        pendingInviteesText: "",
      };

      record.total += 1;
      if (isAcceptedStatus(invite.status)) {
        record.accepted += 1;
        if (invite.invitee) record.acceptedInvitees.push(invite.invitee);
      } else {
        record.pending += 1;
        if (invite.invitee) record.pendingInvitees.push(invite.invitee);
      }

      record.acceptedInviteesText = record.acceptedInvitees.join(", ");
      record.pendingInviteesText = record.pendingInvitees.join(", ");

      map.set(inviter, record);
    });

    return Array.from(map.values()).sort((a, b) => {
      if (b.accepted !== a.accepted) return b.accepted - a.accepted;
      return b.total - a.total;
    });
  }, [filteredInvites]);

  const inviterRewards = React.useMemo(() => {
    return inviterStats.map((stat) => {
      const overrideValue = rewardOverrides[stat.inviter];
      const tier = getTierForAccepted(stat.accepted);
      const rewardPerInvite = Number.isFinite(overrideValue)
        ? overrideValue
        : Number(tier?.amount || 0);
      const payout = rewardPerInvite * stat.accepted;
      const conversion = stat.total
        ? Math.round((stat.accepted / stat.total) * 100)
        : 0;

      return {
        ...stat,
        rewardPerInvite,
        payout,
        conversion,
        tierLabel: tier?.label || "Standard",
        rewardSource: Number.isFinite(overrideValue) ? "Custom" : tier?.label,
      };
    });
  }, [inviterStats, rewardOverrides, sortedTiers]);

  const rewardMap = React.useMemo(() => {
    const map = new Map();
    inviterRewards.forEach((stat) => {
      map.set(stat.inviter, stat.rewardPerInvite);
    });
    return map;
  }, [inviterRewards]);

  const inviteRows = React.useMemo(
    () =>
      filteredInvites.map((invite) => {
        const rewardPerInvite = rewardMap.get(invite.inviter) || 0;
        const rewardPaid = isAcceptedStatus(invite.status)
          ? rewardPerInvite
          : 0;
        return {
          ...invite,
          rewardPerInvite,
          rewardPaid,
        };
      }),
    [filteredInvites, rewardMap],
  );

  const totalInvites = filteredInvites.length;
  const totalAccepted = filteredInvites.filter((item) =>
    isAcceptedStatus(item.status),
  ).length;
  const totalPending = filteredInvites.filter(
    (item) => !isAcceptedStatus(item.status),
  ).length;
  const totalPayout = inviterRewards.reduce(
    (sum, stat) => sum + stat.payout,
    0,
  );
  const topInviter = inviterRewards[0];

  const updateTierAmount = (index, value) => {
    setRewardTiers((prev) =>
      prev.map((tier, i) =>
        i === index ? { ...tier, amount: value || 0 } : tier,
      ),
    );
  };

  const handleRewardOverride = (inviter, value) => {
    setRewardOverrides((prev) => {
      const next = { ...prev };
      if (value === null || value === undefined || value === "") {
        delete next[inviter];
      } else {
        next[inviter] = value;
      }
      return next;
    });
  };

  const rewardInputTemplate = (rowData) => {
    const overrideValue = rewardOverrides[rowData.inviter];
    const displayValue = Number.isFinite(overrideValue)
      ? overrideValue
      : rowData.rewardPerInvite;

    return (
      <div className="d-flex align-items-center gap-2 flex-wrap">
        <InputNumber
          value={displayValue}
          onValueChange={(e) => handleRewardOverride(rowData.inviter, e.value)}
          min={0}
          inputClassName="form-control form-control-sm"
          className="w-100"
          prefix="$"
        />
        {Number.isFinite(overrideValue) && (
          <button
            className="btn btn-link p-0 text-decoration-none small"
            type="button"
            onClick={() => handleRewardOverride(rowData.inviter, null)}
          >
            Reset
          </button>
        )}
      </div>
    );
  };

  const rewardTypeTemplate = (rowData) => {
    const hasOverride = Number.isFinite(rewardOverrides[rowData.inviter]);
    return (
      <Tag
        value={hasOverride ? "Custom" : rowData.tierLabel}
        severity={hasOverride ? "warning" : "info"}
      />
    );
  };

  const payoutTemplate = (rowData) =>
    rowData.payout ? `$${rowData.payout.toLocaleString()}` : "N/A";

  const rewardPaidTemplate = (rowData) =>
    rowData.rewardPaid ? `$${rowData.rewardPaid.toLocaleString()}` : "N/A";

  return (
    <>
      <PageTitle motherMenu="Invites" activeMenu="Invite Friends" />

      <div className="row g-3 mb-3">
        <div className="col-lg-6">
          <div className="row">
            <div className="col-12 col-lg-6">
              <StatCard
                title="Total Invites"
                value={totalInvites.toLocaleString()}
                icon={SVGICON.PatientUser}
                color="primary"
              />
            </div>
            <div className="col-12 col-lg-6">
              <StatCard
                title="Invites Accepted"
                value={totalAccepted.toLocaleString()}
                icon={SVGICON.ArrowGreen}
                color="success"
              />
            </div>
            <div className="col-12 col-lg-6">
              <StatCard
                title="Invites Pending"
                value={totalPending.toLocaleString()}
                icon={SVGICON.ArrowRed}
                color="warning"
              />
            </div>
            <div className="col-12 col-lg-6">
              <StatCard
                title="Estimated Payout"
                value={`$${totalPayout.toLocaleString()}`}
                icon={SVGICON.DollerSvg}
                color="info"
              />
            </div>
          </div>
        </div>

        <div className="col-xl-6">
          <div className="card nova-panel">
            <div className="card-body">
              <h4 className="mb-1">Reward Rules</h4>

              {rewardTiers.map((tier, index) => (
                <div
                  key={tier.label}
                  className="d-flex align-items-center justify-content-between border rounded p-2 mb-2"
                >
                  <div>
                    <div className="fw-semibold">{tier.label}</div>
                    <div className="text-muted small">
                      {tier.min}
                      {tier.max !== null ? `-${tier.max}` : "+"} accepted
                    </div>
                  </div>
                  <InputNumber
                    value={tier.amount}
                    onValueChange={(e) => updateTierAmount(index, e.value)}
                    min={0}
                    inputClassName="form-control form-control-sm"
                    className="text-end"
                    prefix="$"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="row g-3 mb-3">
        <div className="col-xl-12">
          <div className="card nova-panel">
            <div className="card-body">
              <DataTable
                value={inviterRewards}
                paginator
                rows={6}
                className="p-datatable-sm nova-table"
                globalFilter={inviterSearch}
                globalFilterFields={[
                  "inviter",
                  "inviterEmail",
                  "acceptedInviteesText",
                  "pendingInviteesText",
                ]}
                header={
                  <div className="nova-table-toolbar">
                    <div>
                      <h4 className="mb-0">Inviter Performance</h4>
                      <span className="text-muted">
                        Accepted invites, conversion, and rewards.
                      </span>
                    </div>
                    <div className="nova-table-filters">
                      <span className="p-input-icon-left nova-input">
                        <i className="pi pi-search" />
                        <InputText
                          value={inviterSearch}
                          onChange={(e) => setInviterSearch(e.target.value)}
                          placeholder="Search inviters"
                        />
                      </span>
                    </div>
                  </div>
                }
              >
                <Column
                  field="inviter"
                  header="Inviter"
                  body={(row) => renderPerson(row.inviter, row.inviterEmail)}
                />
                <Column field="accepted" header="Accepted" sortable />
                <Column field="pending" header="Pending" sortable />
                <Column field="total" header="Total Invites" sortable />
                <Column
                  field="conversion"
                  header="Conversion"
                  body={(row) => `${row.conversion}%`}
                  sortable
                />
                <Column
                  header="Accepted Invitees"
                  body={(row) => formatInviteeList(row.acceptedInvitees)}
                />
                <Column header="Reward/Invite" body={rewardInputTemplate} />
                <Column header="Reward Type" body={rewardTypeTemplate} />
                <Column
                  field="payout"
                  header="Est. Payout"
                  body={payoutTemplate}
                  sortable
                />
              </DataTable>
            </div>
          </div>
        </div>
      </div>

      <div className="card nova-panel">
        <div className="card-body">
          <DataTable
            value={inviteRows}
            paginator
            rows={8}
            className="p-datatable-sm nova-table"
            globalFilter={globalFilterValue}
            globalFilterFields={[
              "id",
              "inviter",
              "inviterEmail",
              "invitee",
              "inviteeEmail",
              "status",
            ]}
            header={
              <div className="nova-table-toolbar">
                <div>
                  <h4 className="mb-0">Invite Activity</h4>
                  <span className="text-muted">
                    Who invited whom and the reward issued.
                  </span>
                </div>
                <div className="nova-table-filters">
                  <span className="p-input-icon-left nova-input">
                    <i className="pi pi-search" />
                    <InputText
                      value={globalFilterValue}
                      onChange={(e) => setGlobalFilterValue(e.target.value)}
                      placeholder="Search invites"
                    />
                  </span>
                  <Dropdown
                    value={datePreset}
                    onChange={(e) => setDatePreset(e.value)}
                    options={[
                      { label: "All", value: "all" },
                      { label: "Weekly", value: "weekly" },
                      { label: "Monthly", value: "monthly" },
                      { label: "Custom Range", value: "custom" },
                    ]}
                    placeholder="Date Filter"
                    className="nova-dropdown"
                  />
                  <Calendar
                    value={dateRange}
                    onChange={(e) => setDateRange(e.value)}
                    selectionMode="range"
                    readOnlyInput
                    placeholder="Select range"
                    className="nova-calendar"
                    disabled={datePreset !== "custom"}
                  />
                </div>
              </div>
            }
          >
            <Column field="id" header="Invite ID" sortable />
            <Column
              header="Inviter"
              body={(row) => renderPerson(row.inviter, row.inviterEmail)}
            />
            <Column
              header="Invitee"
              body={(row) => renderPerson(row.invitee, row.inviteeEmail)}
            />
            <Column field="date" header="Date" sortable />
            <Column field="status" header="Status" body={statusTemplate} />
            <Column
              field="rewardPaid"
              header="Reward"
              body={rewardPaidTemplate}
            />
          </DataTable>
        </div>
      </div>
    </>
  );
};

export default Invites;
