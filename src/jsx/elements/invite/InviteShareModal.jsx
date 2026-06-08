import { useState } from "react";
import { Modal } from "react-bootstrap";
import { toast } from "react-toastify";
import { copyTextToClipboard } from "../../../utils/clipboard";

const SHARE_OPTIONS = [
  {
    key: "telegram",
    label: "Telegram",
    icon: "pi-send",
    color: "#0088cc",
    bg: "#e8f5ff",
    buildUrl: (link) =>
      `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent("Join Nova with my invite link")}`,
  },
  {
    key: "whatsapp",
    label: "WhatsApp",
    icon: "pi-whatsapp",
    color: "#25d366",
    bg: "#e8faf0",
    buildUrl: (link) =>
      `https://wa.me/?text=${encodeURIComponent(`Join Nova: ${link}`)}`,
  },
  {
    key: "twitter",
    label: "Twitter",
    icon: "pi-twitter",
    color: "#1da1f2",
    bg: "#e8f5fd",
    buildUrl: (link) =>
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(`Join Nova: ${link}`)}`,
  },
  {
    key: "copy",
    label: "Copy Link",
    icon: "pi-copy",
    color: "#2a6587",
    bg: "#dcedf5",
    action: "copy",
  },
  {
    key: "share",
    label: "Share",
    icon: "pi-share-alt",
    color: "#7c3aed",
    bg: "#f0ebff",
    action: "native",
  },
];

const truncateLink = (v, max = 38) => {
  const s = String(v || "");
  return s.length > max ? s.slice(0, max) + "..." : s;
};

const InviteShareModal = ({ show, onHide, invitationLink = "" }) => {
  const safeLink = String(invitationLink || "").trim();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await copyTextToClipboard(safeLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Unable to copy invitation link.");
    }
  };

  const handleOptionClick = async (option) => {
    if (!safeLink) {
      toast.error("Invitation link is not available yet.");
      return;
    }
    if (option.action === "copy") { await handleCopy(); return; }
    if (option.action === "native") {
      if (navigator?.share) {
        try { await navigator.share({ title: "Nova Invitation", text: "Join Nova with my invitation link.", url: safeLink }); }
        catch { /* dismissed */ }
      } else {
        await handleCopy();
      }
      return;
    }
    if (option.buildUrl) window.open(option.buildUrl(safeLink), "_blank", "noopener,noreferrer");
  };

  return (
    <Modal show={show} onHide={onHide} centered className="nova-share-modal-wrap">
      <div className="nova-share-modal">
        {/* Header */}
        <div className="nova-share-modal-head">
          <div className="nova-share-modal-title">
            <span className="nova-share-modal-title-ico"><i className="pi pi-share-alt" /></span>
            Share Your Invite
          </div>
          <button type="button" className="nova-share-close" aria-label="Close" onClick={onHide}>
            <i className="pi pi-times" />
          </button>
        </div>

        {/* Link preview */}
        {safeLink && (
          <div className="nova-share-link-preview">
            <i className="pi pi-link nova-share-link-ico" />
            <span className="nova-share-link-text">{truncateLink(safeLink)}</span>
            <div className="nova-share-copy-wrap">
              <button
                type="button"
                className={`nova-share-link-copy ${copied ? "is-copied" : ""}`}
                onClick={handleCopy}
              >
                <i className={`pi ${copied ? "pi-check" : "pi-copy"}`} />
              </button>
              {copied && <span className="nova-share-copy-tooltip">Copied!</span>}
            </div>
          </div>
        )}

        {/* Share options grid */}
        <div className="nova-share-grid">
          {SHARE_OPTIONS.map((option) => (
            <button
              key={option.key}
              type="button"
              className="nova-share-item"
              onClick={() => handleOptionClick(option)}
            >
              <span
                className="nova-share-item-ico"
                style={{ background: option.bg, color: option.color }}
              >
                <i className={`pi ${option.icon}`} />
              </span>
              <span className="nova-share-item-label">{option.label}</span>
            </button>
          ))}
        </div>
      </div>
    </Modal>
  );
};

export default InviteShareModal;
