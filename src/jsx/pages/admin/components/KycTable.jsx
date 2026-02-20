import { useCallback, useEffect, useRef, useState } from "react";
import { Modal } from "react-bootstrap";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { Button } from "primereact/button";
import { InputText } from "primereact/inputtext";
import { Tag } from "primereact/tag";
import { parseNovaDate } from "./dateUtils";
import { getStatusSeverity } from "./statusUtils";
import { request } from "../../../../utils/api";

const normalizeStatusLabel = (status) => {
  if (!status) return "Unknown";
  return String(status)
    .replace(/_/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
};

const normalizeStatusFilter = (status) => {
  if (!status) return "";
  return String(status).trim().toLowerCase();
};

const getDisplayValue = (value) => {
  if (value === null || value === undefined || value === "") return "N/A";
  return value;
};

const getFullName = (item) => {
  const first = item.first_name_en || item.first_name || "";
  const last = item.last_name_en || item.last_name || "";
  const fullName = `${first} ${last}`.trim();
  return fullName || "N/A";
};

const getEmail = (item) =>
  item.identity_card_email ||
  item.email ||
  item?.tevau_user?.user?.email ||
  "N/A";

const formatDateTime = (value) => {
  const date = value instanceof Date ? value : parseNovaDate(value);
  if (!date) return "N/A";
  return date.toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
};

const formatDate = (value) => {
  const date = value instanceof Date ? value : parseNovaDate(value);
  if (!date) return "N/A";
  return date.toLocaleDateString("en-US", { dateStyle: "medium" });
};

const KycTable = ({ title, statusFilter }) => {
  const dt = useRef(null);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [globalFilterValue, setGlobalFilterValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [kycList, setKycList] = useState([]);
  const [statusValue, setStatusValue] = useState(
    normalizeStatusFilter(statusFilter),
  );
  const [detailRecord, setDetailRecord] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [pagination, setPagination] = useState({
    total: 0,
    per_page: 15,
    current_page: 1,
  });

  const getKycList = useCallback(async (page = 1, search = "", status = "") => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        per_page: pagination.per_page,
        page,
      });
      if (search) params.append("search", search);
      if (status) params.append("status", status);

      const response = await request({
        url: `/tevau/kyc?${params.toString()}`,
        method: "GET",
      });

      const records = (response.data?.data || []).map((item) => ({
        ...item,
        fullName: getFullName(item),
        email: getEmail(item),
        identityCard: item.identity_card || item.identityCard || "N/A",
        submittedAt: parseNovaDate(item.submitted_at || item.submittedAt),
        approvedAt: parseNovaDate(item.approved_at || item.approvedAt),
        identityCardValidityTime: parseNovaDate(
          item.identity_card_validity_time || item.identityCardValidityTime,
        ),
        statusLabel: normalizeStatusLabel(item.status),
      }));

      setKycList(records);

      setPagination((prev) => ({
        ...prev,
        total: response.data?.total || 0,
        current_page: response.data?.current_page || 1,
      }));
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [pagination.per_page]);

  useEffect(() => {
    setStatusValue(normalizeStatusFilter(statusFilter));
  }, [statusFilter]);

  useEffect(() => {
    getKycList(1, globalFilterValue, statusValue);
  }, [getKycList, globalFilterValue, statusValue]);

  const onGlobalFilterChange = (e) => {
    setGlobalFilterValue(e.target.value);
  };

  const exportCSV = () => {
    dt.current.exportCSV();
  };

  const actionTemplate = (rowData) => (
    <Button
      icon="pi pi-eye"
      className="p-button-text p-button-rounded p-button-plain"
      onClick={() => {
        setDetailRecord(rowData);
        setDetailOpen(true);
      }}
    />
  );

  const statusTemplate = (rowData) => (
    <Tag
      value={rowData.statusLabel || "Unknown"}
      severity={getStatusSeverity(rowData.statusLabel)}
    />
  );

  const renderHeader = () => (
    <div className="nova-table-toolbar">
      <div>
        <h4 className="mb-0">{title}</h4>
        <span className="text-muted">All KYC activities </span>
      </div>
      <div
        className="nova-table-filters"
        style={{ display: "flex", gap: "0.5rem" }}
      >
        <span className="p-input-icon-left nova-input">
          <i className="pi pi-search" />
          <InputText
            value={globalFilterValue}
            onChange={onGlobalFilterChange}
            placeholder="Search KYC"
          />
        </span>
        <button
          onClick={exportCSV}
          className="btn btn-block text-white "
          style={{
            backgroundColor: "#285e7f",
            width: "150px",
            fontSize: "14px",
          }}
        >
          <i className="pi pi-file text-white me-2" />
          Export CSV
        </button>
      </div>
    </div>
  );
  const header = renderHeader();
  const detailTevau = detailRecord?.tevau_user || {};
  const detailUser = detailTevau?.user || {};
  const detailStatus =
    detailRecord?.statusLabel || normalizeStatusLabel(detailRecord?.status);

  return (
    <div className="card nova-panel">
      <div className="card-body">
        <DataTable
          ref={dt}
          value={kycList}
          loading={loading}
          paginator
          lazy
          rows={pagination.per_page}
          totalRecords={pagination.total}
          first={(pagination.current_page - 1) * pagination.per_page}
          onPage={(e) => getKycList(e.page + 1, globalFilterValue, statusValue)}
          header={header}
          className="p-datatable-sm nova-table"
          selectionMode="single"
          selection={selectedRecord}
          onSelectionChange={(e) => setSelectedRecord(e.value)}
        >
          <Column field="id" header="ID" sortable />
          <Column field="fullName" header="Name" sortable />
          <Column field="identityCard" header="Identity Card" sortable />
          <Column
            field="statusLabel"
            header="Status"
            body={statusTemplate}
            sortable
          />
          <Column
            field="submittedAt"
            header="Submitted At"
            body={(rowData) => formatDateTime(rowData.submittedAt)}
            sortable
          />
          <Column
            field="approvedAt"
            header="Approved At"
            body={(rowData) => formatDateTime(rowData.approvedAt)}
            sortable
          />
          <Column
            field="identityCardValidityTime"
            header="ID Validity"
            body={(rowData) => formatDate(rowData.identityCardValidityTime)}
            sortable
          />
          <Column field="email" header="Email" sortable />
          <Column header="Action" body={actionTemplate} />
        </DataTable>
      </div>
      <Modal
        show={detailOpen}
        onHide={() => setDetailOpen(false)}
        centered
        size="lg"
      >
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">KYC Details</h5>
            <button
              type="button"
              className="btn-close"
              onClick={() => setDetailOpen(false)}
            />
          </div>
          <div className="modal-body">
            {detailRecord && (
              <>
                <div className="row g-3">
                  <div className="col-12">
                    <h6 className="mb-0">KYC Summary</h6>
                  </div>
                  <div className="col-md-6">
                    <div className="text-muted small">KYC ID</div>
                    <div className="fw-semibold">
                      {getDisplayValue(detailRecord.id)}
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="text-muted small">User Code</div>
                    <div className="fw-semibold">
                      {getDisplayValue(detailRecord.user_code)}
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="text-muted small">Name</div>
                    <div className="fw-semibold">
                      {getDisplayValue(detailRecord.fullName)}
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="text-muted small">Email</div>
                    <div className="fw-semibold">
                      {getDisplayValue(getEmail(detailRecord))}
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="text-muted small">Status</div>
                    <div className="fw-semibold">
                      <Tag
                        value={detailStatus}
                        severity={getStatusSeverity(detailStatus)}
                      />
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="text-muted small">Rejection Reason</div>
                    <div className="fw-semibold">
                      {getDisplayValue(detailRecord.rejection_reason)}
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="text-muted small">Submitted At</div>
                    <div className="fw-semibold">
                      {formatDateTime(detailRecord.submitted_at)}
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="text-muted small">Approved At</div>
                    <div className="fw-semibold">
                      {formatDateTime(detailRecord.approved_at)}
                    </div>
                  </div>
                </div>

                <hr />

                <div className="row g-3">
                  <div className="col-12">
                    <h6 className="mb-0">Personal Information</h6>
                  </div>
                  <div className="col-md-6">
                    <div className="text-muted small">Country</div>
                    <div className="fw-semibold">
                      {getDisplayValue(detailRecord.country_area)}
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="text-muted small">Birthday</div>
                    <div className="fw-semibold">
                      {formatDate(detailRecord.birthday)}
                    </div>
                  </div>
                </div>

                <hr />

                <div className="row g-3">
                  <div className="col-12">
                    <h6 className="mb-0">Identity Document</h6>
                  </div>
                  <div className="col-md-6">
                    <div className="text-muted small">Document Type</div>
                    <div className="fw-semibold">
                      {getDisplayValue(detailRecord.identity_card_type)}
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="text-muted small">Document Number</div>
                    <div className="fw-semibold">
                      {getDisplayValue(detailRecord.identity_card)}
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="text-muted small">Validity</div>
                    <div className="fw-semibold">
                      {formatDate(detailRecord.identity_card_validity_time)}
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="text-muted small">Identity Email</div>
                    <div className="fw-semibold">
                      {getDisplayValue(detailRecord.identity_card_email)}
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="text-muted small">Front Image</div>
                    {detailRecord.identity_front_pic_url ? (
                      <a
                        href={detailRecord.identity_front_pic_url}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <img
                          src={detailRecord.identity_front_pic_url}
                          alt="Identity front"
                          className="img-fluid rounded border mt-1"
                          style={{ maxHeight: "140px" }}
                        />
                      </a>
                    ) : (
                      <div className="fw-semibold">N/A</div>
                    )}
                  </div>
                  <div className="col-md-6">
                    <div className="text-muted small">Back Image</div>
                    {detailRecord.identity_back_pic_url ? (
                      <a
                        href={detailRecord.identity_back_pic_url}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <img
                          src={detailRecord.identity_back_pic_url}
                          alt="Identity back"
                          className="img-fluid rounded border mt-1"
                          style={{ maxHeight: "140px" }}
                        />
                      </a>
                    ) : (
                      <div className="fw-semibold">N/A</div>
                    )}
                  </div>
                </div>

                <hr />

                <div className="row g-3">
                  <div className="col-12">
                    <h6 className="mb-0">User Account</h6>
                  </div>
                  <div className="col-md-6">
                    <div className="text-muted small">Tevau User ID</div>
                    <div className="fw-semibold">
                      {getDisplayValue(detailTevau.id)}
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="text-muted small">Third ID</div>
                    <div className="fw-semibold">
                      {getDisplayValue(detailTevau.third_id)}
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="text-muted small">Account Status</div>
                    <div className="fw-semibold">
                      {getDisplayValue(detailTevau.status)}
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="text-muted small">User Email</div>
                    <div className="fw-semibold">
                      {getDisplayValue(detailUser.email)}
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="text-muted small">Role</div>
                    <div className="fw-semibold">
                      {getDisplayValue(detailUser.role)}
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="text-muted small">Active</div>
                    <div className="fw-semibold">
                      {detailUser.is_active === undefined
                        ? "N/A"
                        : detailUser.is_active
                          ? "Yes"
                          : "No"}
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="text-muted small">User Created At</div>
                    <div className="fw-semibold">
                      {formatDateTime(detailUser.created_at)}
                    </div>
                  </div>
                </div>

                <hr />

                <div className="row g-3">
                  <div className="col-12">
                    <h6 className="mb-0">Audit</h6>
                  </div>
                  <div className="col-md-6">
                    <div className="text-muted small">Created At</div>
                    <div className="fw-semibold">
                      {formatDateTime(detailRecord.created_at)}
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="text-muted small">Updated At</div>
                    <div className="fw-semibold">
                      {formatDateTime(detailRecord.updated_at)}
                    </div>
                  </div>
                </div>

              </>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default KycTable;
