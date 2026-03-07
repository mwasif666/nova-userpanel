const OverviewCardsModal = ({
  overviewModal,
  onClose,
  normalizeCardType,
  normalizeStatus,
  formatCurrencyValue,
  formatDateTime,
  walletCurrency,
}) => (
  <>
    <div className="modal-header">
      <div>
        <h5 className="modal-title">{overviewModal.title || "Cards"}</h5>
        <div className="text-muted small">{overviewModal.subtitle || "Cards list"}</div>
      </div>
      <button type="button" className="btn-close" onClick={onClose} aria-label="Close" />
    </div>
    <div className="modal-body">
      <div className="table-responsive">
        <table className="table table-sm align-middle mb-0">
          <thead>
            <tr>
              <th>Card ID</th>
              <th>Type</th>
              <th>Status</th>
              <th>Balance</th>
              <th>Bound</th>
              <th>Created</th>
            </tr>
          </thead>
          <tbody>
            {!overviewModal.rows.length ? (
              <tr>
                <td colSpan={6} className="text-center text-muted py-4">
                  No cards found for this selection.
                </td>
              </tr>
            ) : (
              overviewModal.rows.map((card, index) => {
                const boundRaw = String(card?.is_bound || "").toLowerCase();
                const boundLabel =
                  typeof card?.is_bound === "boolean"
                    ? card.is_bound
                      ? "Yes"
                      : "No"
                    : boundRaw === "1" || boundRaw === "true" || boundRaw === "yes"
                      ? "Yes"
                      : boundRaw === "0" || boundRaw === "false" || boundRaw === "no"
                        ? "No"
                        : "N/A";

                return (
                  <tr key={`overview-card-${String(card?.id ?? card?.card_id ?? index)}`}>
                    <td>{card?.card_id || card?.id || "N/A"}</td>
                    <td>{normalizeCardType(card?.card_type || card?.type)}</td>
                    <td>{normalizeStatus(card?.status)}</td>
                    <td>
                      {formatCurrencyValue(
                        card?.balance,
                        card?.currency || walletCurrency || "USD",
                      )}
                    </td>
                    <td>{boundLabel}</td>
                    <td>{formatDateTime(card?.created_at)}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  </>
);

export default OverviewCardsModal;
