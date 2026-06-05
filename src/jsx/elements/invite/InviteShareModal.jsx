import { Modal } from "react-bootstrap";
import { toast } from "react-toastify";
import { copyTextToClipboard } from "../../../utils/clipboard";

const SHARE_OPTIONS = [
  {
    key: "telegram",
    label: "Telegram",
    icon: "pi-send",
    buildUrl: (link) =>
      `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent("Join Nova with my invite link")}`,
  },
  {
    key: "whatsapp",
    label: "WhatsApp",
    icon: "pi-whatsapp",
    buildUrl: (link) =>
      `https://wa.me/?text=${encodeURIComponent(`Join Nova: ${link}`)}`,
  },
  {
    key: "twitter",
    label: "Twitter",
    icon: "pi-twitter",
    buildUrl: (link) =>
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(`Join Nova: ${link}`)}`,
  },
  {
    key: "copy",
    label: "Copy Link",
    icon: "pi-copy",
    action: "copy",
  },
  {
    key: "share",
    label: "Share To",
    icon: "pi-share-alt",
    action: "native",
  },
];

const InviteShareModal = ({ show, onHide, invitationLink = "" }) => {
  const safeLink = String(invitationLink || "").trim();

  const handleCopy = async () => {
    try {
      await copyTextToClipboard(safeLink);
      toast.success("Invitation link copied.");
    } catch {
      toast.error("Unable to copy invitation link.");
    }
  };

  const handleOptionClick = async (option) => {
    if (!safeLink) {
      toast.error("Invitation link is not available yet.");
      return;
    }

    if (option.action === "copy") {
      await handleCopy();
      return;
    }

    if (option.action === "native") {
      if (navigator?.share) {
        try {
          await navigator.share({
            title: "Nova Invitation",
            text: "Join Nova with my invitation link.",
            url: safeLink,
          });
        } catch {
          // User dismissed native share sheet.
        }
      } else {
        await handleCopy();
      }
      return;
    }

    if (option.buildUrl) {
      window.open(option.buildUrl(safeLink), "_blank", "noopener,noreferrer");
    }
  };

  return (
    <Modal show={show} onHide={onHide} centered className="nova-invite-share-modal">
      <div className="modal-content nova-invite-share-panel">
        <div className="modal-header border-0 pb-0">
          <h5 className="modal-title w-100 text-center">Share</h5>
          <button
            type="button"
            className="btn-close"
            aria-label="Close"
            onClick={onHide}
          />
        </div>

        <div className="modal-body pt-3">
          <div className="nova-invite-share-grid">
            {SHARE_OPTIONS.map((option) => (
              <button
                key={option.key}
                type="button"
                className="nova-invite-share-item"
                onClick={() => handleOptionClick(option)}
              >
                <span className="nova-invite-share-icon">
                  <i className={`pi ${option.icon}`} />
                </span>
                <span>{option.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default InviteShareModal;
