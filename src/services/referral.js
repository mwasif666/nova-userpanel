import { request } from "../utils/api";

export const REFERRAL_API_URL = "app/tevau/users/me";

export const DEFAULT_REFERRAL_REWARDS = [
  { level: 1, cardType: "Physical", reward: "$10", icon: "physical" },
  { level: 1, cardType: "Virtual", reward: "$2", icon: "virtual" },
  { level: 2, cardType: "Physical", reward: "$15", icon: "physical" },
  { level: 2, cardType: "Virtual", reward: "$3", icon: "virtual" },
];

export const RANK_SLIDE_CONFIG = [
  {
    key: "current",
    title: "Your Referral Rank",
    icon: "pi-shield",
    showAffiliateCta: false,
  },
  {
    key: "next",
    title: "Next Rank",
    icon: "pi-stop",
    showAffiliateCta: false,
  },
  {
    key: "top",
    title: "Top Rank",
    icon: "pi-star",
    showAffiliateCta: true,
  },
];

const RANK_PROGRESS_TARGET = 5;

const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const buildInvitationLink = (invitationCode) => {
  const code = String(invitationCode || "").trim();
  if (!code) return "";

  const origin =
    typeof window !== "undefined" && window.location?.origin
      ? window.location.origin
      : "https://user.novacrest.io";

  const url = new URL("/signup", origin);
  url.searchParams.set("referral_code", code);
  return url.toString();
};

const normalizeRewards = (rows) => {
  if (!Array.isArray(rows) || rows.length === 0) {
    return DEFAULT_REFERRAL_REWARDS;
  }

  return rows.map((row, index) => {
    const cardType = String(row?.card_type || row?.cardType || row?.type || "Card");
    const isVirtual = cardType.toLowerCase().includes("virtual");

    return {
      id: String(row?.id ?? `reward-${index}`),
      level: toNumber(row?.level ?? row?.tier, 1),
      cardType,
      reward: String(row?.reward || row?.amount || row?.value || "—"),
      icon: isVirtual ? "virtual" : "physical",
    };
  });
};

const normalizeChart = (tevauData = {}) => {
  const chart = tevauData?.chart && typeof tevauData.chart === "object"
    ? tevauData.chart
    : {};
  const statistics = tevauData?.statistics && typeof tevauData.statistics === "object"
    ? tevauData.statistics
    : {};

  const labels = Array.isArray(chart.labels)
    ? chart.labels
    : Array.isArray(chart.dates)
      ? chart.dates
      : Array.isArray(statistics.labels)
        ? statistics.labels
        : [];

  const inviteRebate = Array.isArray(chart.invite_rebate)
    ? chart.invite_rebate
    : Array.isArray(statistics.invite_rebate)
      ? statistics.invite_rebate
      : [];

  const subAffiliateRebate = Array.isArray(chart.sub_affiliate_rebate)
    ? chart.sub_affiliate_rebate
    : Array.isArray(statistics.sub_affiliate_rebate)
      ? statistics.sub_affiliate_rebate
      : [];

  const fallbackLabels =
    labels.length > 0
      ? labels
      : ["01.17", "01.18", "01.19", "01.20", "01.21", "01.22", "01.23"];

  return {
    labels: fallbackLabels.map(String),
    inviteRebate: (inviteRebate.length ? inviteRebate : new Array(fallbackLabels.length).fill(0)).map(
      (value) => toNumber(value, 0),
    ),
    subAffiliateRebate: (
      subAffiliateRebate.length
        ? subAffiliateRebate
        : new Array(fallbackLabels.length).fill(0)
    ).map((value) => toNumber(value, 0)),
  };
};

/**
 * Maps GET app/tevau/users/me response:
 * { status: true, data: { id, user_code, user_id, user: { invitation_code, referral_level, ... }, cards, latest_kyc, tevau_response } }
 */
export const mapTevauUserMeResponse = (response) => {
  const profile = response?.data && typeof response.data === "object" ? response.data : {};
  const account = profile?.user && typeof profile.user === "object" ? profile.user : {};
  const tevauData =
    profile?.tevau_response?.data && typeof profile.tevau_response.data === "object"
      ? profile.tevau_response.data
      : {};

  const invitationCode = String(account.invitation_code || "").trim();
  const referralLevel = Math.max(1, toNumber(account.referral_level, 1));

  const progressCurrent = toNumber(
    tevauData.rank_progress_current ??
      tevauData.progress_current ??
      tevauData.invited_count ??
      tevauData.total_invitations,
    0,
  );

  const progressTarget = Math.max(
    toNumber(
      tevauData.rank_progress_target ??
        tevauData.progress_target ??
        tevauData.invite_target,
      RANK_PROGRESS_TARGET,
    ),
    1,
  );

  return {
    invitationCode,
    invitationLink: buildInvitationLink(invitationCode),
    userCode: String(profile.user_code || "").trim(),
    tevauUserId: profile.id ?? null,
    userId: profile.user_id ?? account.id ?? null,
    thirdId: String(profile.third_id || "").trim(),
    profileStatus: String(profile.status || "").trim(),
    accountName: String(account.name || "").trim(),
    accountEmail: String(account.email || "").trim(),
    accountPhone: String(account.phone || "").trim(),
    referredById: account.referred_by_id ?? null,
    referralLevel,
    currentRank: referralLevel,
    nextRank: referralLevel + 1,
    progressCurrent,
    progressTarget,
    totalEarned: toNumber(
      tevauData.total_earned ??
        tevauData.total_earnings ??
        tevauData.total_rebates ??
        tevauData.earned_usdt,
      0,
    ),
    totalInvitations: toNumber(
      tevauData.total_invitations ??
        tevauData.invite_count ??
        tevauData.invited_count,
      0,
    ),
    cardsCount: Array.isArray(profile.cards) ? profile.cards.length : 0,
    kycStatus: String(profile.latest_kyc?.status || "").trim(),
    rewards: normalizeRewards(tevauData.rewards || tevauData.referral_rewards),
    chart: normalizeChart(tevauData),
    affiliateProgramUrl: String(
      tevauData.affiliate_program_url || tevauData.affiliate_url || "",
    ).trim(),
  };
};

export const createEmptyReferralState = () => mapTevauUserMeResponse({ status: true, data: {} });

export const fetchReferralProgram = async () => {
  const response = await request({
    url: REFERRAL_API_URL,
    method: "GET",
  });

  return mapTevauUserMeResponse(response);
};

// Backward-compatible alias used by the hook fallback.
export const normalizeReferralPayload = createEmptyReferralState;

export const formatUsdtAmount = (value, fractionDigits = 8) => {
  const numeric = toNumber(value, 0);
  return `≈ ${numeric.toLocaleString("en-US", {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  })}`;
};
