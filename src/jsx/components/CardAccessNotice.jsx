import React from "react";
import { Link } from "react-router-dom";

const CardAccessNotice = ({
  title = "Card Access Restricted",
  message = "At least one purchased card is required before this section becomes available.",
  className = "",
  variant = "compact",
}) => {
  const isDashboard = variant === "dashboard";

  return (
    <div className={`nova-access-wrap ${isDashboard ? "is-dashboard" : ""}`}>
      <div className={`card nova-panel ${className}`.trim()}>
        <div className="card-body">
          <div
            className={`nova-card-access-notice ${
              isDashboard ? "is-dashboard" : ""
            }`}
          >
            {isDashboard ? (
              <div className="nova-access-side-icon" aria-hidden="true">
                <i className="pi pi-lock" />
                <span>
                  <i className="pi pi-shield" />
                </span>
              </div>
            ) : null}

            <div className="nova-access-content">
              <div className="nova-flow-kicker mb-2">Security Control</div>
              <h4 className="mb-2">{title}</h4>
              <p className="text-muted mb-3">
                {isDashboard ? (
                  <>
                    To enhance your account security, your card access has been
                    restricted. Please complete{" "}
                    <Link to="/kyc">KYC verification</Link> to restore full
                    access and continue seamless transactions.
                  </>
                ) : (
                  message
                )}
              </p>
              <div className="nova-settings-actions justify-content-start mt-0">
                <Link to="/profile" className="btn btn-primary">
                  {isDashboard ? <i className="pi pi-user me-2" /> : null}
                  Go to Profile
                </Link>
                <Link to="/kyc" className="btn btn-outline-primary">
                  {isDashboard ? <i className="pi pi-id-card me-2" /> : null}
                  Open KYC
                </Link>
              </div>
            </div>

            {isDashboard ? (
              <div className="nova-access-illustration" aria-hidden="true">
                <span className="nova-access-dot is-one" />
                <span className="nova-access-dot is-two" />
                <span className="nova-access-dot is-three" />
                <div className="nova-access-shield">
                  <i className="pi pi-lock" />
                </div>
                <span className="nova-access-leaf is-left" />
                <span className="nova-access-leaf is-right" />
                <span className="nova-access-shadow" />
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {isDashboard ? (
        <div className="nova-dashboard-support-strip">
          <div className="nova-dashboard-support-copy">
            <i className="pi pi-question-circle" />
            <span>
              <strong>Need help?</strong> Contact our support team for
              assistance.
            </span>
          </div>
          <span className="nova-dashboard-support-divider" />
          <button type="button" className="nova-dashboard-support-link">
            Contact Support <i className="pi pi-arrow-right" />
          </button>
        </div>
      ) : null}
    </div>
  );
};

export default CardAccessNotice;
