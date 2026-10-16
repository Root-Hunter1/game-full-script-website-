/* Admin panel - mobile helper.
   Only marks empty table cells ("-") with a class so the mobile card
   layout can hide them. It changes nothing visible on desktop. */
(function () {
    function markEmptyCells() {
        var cells = document.querySelectorAll(
            ".order-table-wrap td, #depositsContainer td"
        );

        cells.forEach(function (td) {
            var empty;

            if (td.classList.contains("order-actions")) {
                empty = !td.querySelector("button");
            } else {
                var text = (td.textContent || "").replace(/\s+/g, "");
                empty = (text === "" || text === "-" || text === "\u2014");
            }

            td.classList.toggle("cell-empty", empty);
        });
    }

    ["ordersContainer", "depositsContainer"].forEach(function (id) {
        var el = document.getElementById(id);
        if (!el) return;

        new MutationObserver(markEmptyCells).observe(el, {
            childList: true,
            subtree: true
        });
    });

    markEmptyCells();
})();
