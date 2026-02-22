import React from "react";
import PageTitle from "../../layouts/PageTitle";

const UserPlaceholderPage = ({ title, description }) => {
  return (
    <>
      <PageTitle motherMenu={title} activeMenu={title} />
      <div className="card nova-panel">
        <div className="card-body">
          <div className="nova-user-placeholder">
            <div className="nova-user-placeholder-badge">User Panel</div>
            <h4>{title}</h4>
            <p>{description || `${title} page user panel ke liye customize karni hai.`}</p>
          </div>
        </div>
      </div>
    </>
  );
};

export default UserPlaceholderPage;
