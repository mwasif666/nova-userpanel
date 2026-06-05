import { Routes, Route, Navigate } from "react-router-dom";
import MainLayout from "../layouts/MainLayout";
import ScrollToTop from "../layouts/ScrollToTop";
import WalletAccessGate from "../components/guards/WalletAccessGate";
import { APP_ROUTES, ERROR_ROUTES } from "./routes";

import "../index.css";
import "../chart.css";
import "../step.css";

import Home from "../pages/dashboard/Home";
import Kyc from "../pages/user/Kyc";
import Wallet from "../elements/Wallet/Wallet";
import Cards from "../pages/user/Cards";
import CardOrderPage from "../pages/user/CardOrderPage";
import WalletTransactions from "../pages/user/WalletTransactions";
import CardManagement from "../pages/user/CardManagement";
import SecuritySettings from "../pages/user/SecuritySettings";
import Invite from "../pages/user/Invite";
import InviteStatistics from "../pages/user/InviteStatistics";

import LockScreen from "../pages/error/LockScreen";
import Error400 from "../pages/error/Error400";
import Error403 from "../pages/error/Error403";
import Error404 from "../pages/error/Error404";
import Error500 from "../pages/error/Error500";
import Error503 from "../pages/error/Error503";

const Markup = () => (
  <>
    <Routes>
      <Route path={ERROR_ROUTES.lockScreen} element={<LockScreen />} />
      <Route path={ERROR_ROUTES.error400} element={<Error400 />} />
      <Route path={ERROR_ROUTES.error403} element={<Error403 />} />
      <Route path={ERROR_ROUTES.error404} element={<Error404 />} />
      <Route path={ERROR_ROUTES.error500} element={<Error500 />} />
      <Route path={ERROR_ROUTES.error503} element={<Error503 />} />

      <Route element={<MainLayout />}>
        <Route path={APP_ROUTES.home} element={<Home />} />
        <Route path={APP_ROUTES.kyc} element={<Kyc />} />
        <Route path={APP_ROUTES.cardManagement} element={<CardManagement />} />
        <Route path={APP_ROUTES.cards} element={<Cards />} />
        <Route path={APP_ROUTES.cardOrder} element={<CardOrderPage />} />
        <Route
          path={APP_ROUTES.wallet}
          element={
            <WalletAccessGate>
              <Wallet />
            </WalletAccessGate>
          }
        />
        <Route
          path={APP_ROUTES.walletTransactions}
          element={
            <WalletAccessGate>
              <WalletTransactions />
            </WalletAccessGate>
          }
        />
        <Route path={APP_ROUTES.invite} element={<Invite />} />
        <Route path={APP_ROUTES.inviteStatistics} element={<InviteStatistics />} />
        <Route
          path={APP_ROUTES.securitySettings}
          element={<SecuritySettings />}
        />
        <Route path={APP_ROUTES.profile} element={<SecuritySettings />} />
        <Route path="*" element={<Navigate to={APP_ROUTES.home} replace />} />
      </Route>
    </Routes>
    <ScrollToTop />
  </>
);

export default Markup;
