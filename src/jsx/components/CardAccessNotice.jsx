import React from "react";
import { Link } from "react-router-dom";

const CardAccessNotice = ({
  title = "Card Access Restricted",
  message = "At least one purchased card is required before this section becomes available.",
  className = "",
}) => (
  <div className={`card nova-panel ${className}`.trim()}>
    <div className="card-body">
      <div className="nova-card-access-notice">
        <div className="nova-flow-kicker mb-2">Access Control</div>
        <h4 className="mb-2">{title}</h4>
        <p className="text-muted mb-3">{message}</p>
        <div className="nova-settings-actions justify-content-start mt-0">
          <Link to="/profile" className="btn btn-primary">
            Go to Profile
          </Link>
          <Link to="/kyc" className="btn btn-outline-primary">
            Open KYC
          </Link>
        </div>
      </div>
    </div>
  </div>
);

export default CardAccessNotice;
