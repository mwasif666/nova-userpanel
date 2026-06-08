import { Link } from "react-router-dom";

const PageTitle = ({ motherMenu, motherMenuPath = "/", activeMenu }) => {
  return (
    <div className="nova-page-header">
      <h4 className="nova-page-header-title">{activeMenu}</h4>
      <ol className="nova-page-header-crumb">
        <li>
          <Link to={motherMenuPath} className="nova-crumb-link">
            {motherMenu}
          </Link>
        </li>
        <li className="nova-crumb-sep" aria-hidden="true">&gt;</li>
        <li className="nova-crumb-active">{activeMenu}</li>
      </ol>
    </div>
  );
};

export default PageTitle;
