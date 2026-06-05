import { SVGICON } from "../../constant/theme";

export const MenuList = [
  {
    title: "Dashboard",
    classsChange: "mm-collapse",
    iconStyle: SVGICON.dashboard,
    to: "/",
  },
  {
    title: "Cards",
    classsChange: "mm-collapse",
    iconStyle: SVGICON.BillsSvg,
    content: [
      { title: "Order Card", to: "/cards/order" },
      { title: "Cards", to: "/cards" },
    ],
  },
  {
    title: "Wallet",
    classsChange: "mm-collapse",
    iconStyle: SVGICON.WalletSvg,
    content: [
      { title: "Deposit", to: "/wallet" },
      { title: "Transactions", to: "/wallet/transactions" },
    ],
  },
  {
    title: "Invite",
    classsChange: "mm-collapse",
    iconStyle: SVGICON.InviteSvg,
    to: "/invite",
  },
  {
    title: "KYC",
    classsChange: "mm-collapse",
    iconStyle: SVGICON.FormIconSvg,
    to: "/kyc",
  },
  {
    title: "Profile",
    classsChange: "mm-collapse",
    iconStyle: SVGICON.ProfileSvg,
    to: "/profile",
  },
];
