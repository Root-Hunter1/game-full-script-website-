/* ===== GIFT CARD: Buy Now -> contact popup (customers message to buy) ===== */
(function () {
    // Change these three lines if your contact details change.
    const CONTACT_EMAIL = "your-email@example.com";
    function emailNow() { return (window.APEX_CONTACT && window.APEX_CONTACT.email) || CONTACT_EMAIL; }
    const CONTACT_WHATSAPP = "01818019045";          // shown on screen
    const CONTACT_WHATSAPP_INTL = "8800000000000";   // used for the WhatsApp link
    function waIntl() { return (window.APEX_CONTACT && window.APEX_CONTACT.whatsapp) || CONTACT_WHATSAPP_INTL; }
    function waShown() {
        var w = window.APEX_CONTACT && window.APEX_CONTACT.whatsapp;
        if (!w) return CONTACT_WHATSAPP;
        return w.indexOf("880") === 0 ? "0" + w.slice(3) : "+" + w;
    }

    function esc(value) {
        return String(value == null ? "" : value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;");
    }


    // Smaller popup on phones only (screen 768px or narrower). Desktop is not affected.
    function addMobileStyle() {
        if (document.getElementById("apexGiftContactStyle")) return;

        const style = document.createElement("style");
        style.id = "apexGiftContactStyle";
        style.textContent = `
            @media (max-width: 768px) {
                #apexGiftContactModal .gc-overlay { padding: 12px 10px !important; }
                #apexGiftContactModal .gc-box { margin: 10px auto !important; padding: 16px !important; border-radius: 16px !important; }
                #apexGiftContactModal .gc-head { margin-bottom: 14px !important; }
                #apexGiftContactModal .gc-title { font-size: 18px !important; line-height: 1.2 !important; white-space: nowrap !important; }
                #apexGiftContactModal .gc-icon { padding: 5px 7px !important; margin-right: 6px !important; font-size: 15px !important; }
                #apexGiftContactModal .gc-close { padding: 6px 11px !important; font-size: 15px !important; border-radius: 8px !important; }
                #apexGiftContactModal .gc-card { padding: 14px !important; border-radius: 12px !important; }
                #apexGiftContactModal .gc-h3 { font-size: 16px !important; margin-bottom: 10px !important; }
                #apexGiftContactModal .gc-sum { font-size: 14px !important; line-height: 1.5 !important; padding: 11px !important; margin-bottom: 12px !important; border-radius: 8px !important; }
                #apexGiftContactModal .gc-contact { font-size: 14px !important; line-height: 1.7 !important; padding: 12px !important; border-radius: 12px !important; border-width: 1.5px !important; }
                #apexGiftContactModal .gc-note { font-size: 12px !important; margin-top: 8px !important; }
            }
        `;
        document.head.appendChild(style);
    }

    /* ---- Back button support: Back closes the popup instead of leaving the site ---- */
    let giftHistoryPushed = false;

    function removeGiftModal() {
        const m = document.getElementById("apexGiftContactModal");
        if (m) m.remove();
    }

    window.addEventListener("popstate", function (event) {
        const state = event.state;

        // Back pressed while popup is open -> just close the popup
        if (giftHistoryPushed) {
            giftHistoryPushed = false;
            removeGiftModal();
            event.stopImmediatePropagation();
            return;
        }

        // Forward pressed onto the popup's empty history entry -> step back quietly
        if (state && state.page === "giftContact") {
            event.stopImmediatePropagation();
            history.back();
        }
    }, true);

    function closeGiftContact() {
        if (giftHistoryPushed &&
            history.state && history.state.page === "giftContact") {
            history.back();
        } else {
            giftHistoryPushed = false;
            removeGiftModal();
        }
    }

    function openGiftContact(card) {
        addMobileStyle();

        const old = document.getElementById("apexGiftContactModal");
        if (old) old.remove();

        const text = "Hello ApexGamer, I want to buy: " + card.name +
            " (৳" + card.selling_price + ")";
        const waLink = "https://wa.me/" + waIntl() +
            "?text=" + encodeURIComponent(text);
        const mailLink = "mailto:" + emailNow() +
            "?subject=" + encodeURIComponent("Buy " + card.name) +
            "&body=" + encodeURIComponent(text);

        const modal = document.createElement("div");
        modal.id = "apexGiftContactModal";

        modal.innerHTML = `
            <div class="gc-overlay" style="
                position:fixed;
                inset:0;
                background:rgba(0,0,0,.75);
                z-index:99999;
                overflow-y:auto;
                padding:25px 15px;
            ">
                <div class="gc-box" style="
                    max-width:650px;
                    margin:20px auto;
                    background:#11172b;
                    color:white;
                    border-radius:20px;
                    padding:24px;
                    box-shadow:0 20px 60px rgba(0,0,0,.5);
                ">
                    <div class="gc-head" style="
                        display:flex;
                        justify-content:space-between;
                        align-items:center;
                        margin-bottom:20px;
                    ">
                        <h2 class="gc-title" style="margin:0;">
                            <span class="gc-icon" style="
                                background:#ff8a00;
                                border-radius:50%;
                                padding:8px 11px;
                                margin-right:8px;
                            ">🎁</span>
                            Buy Gift Card
                        </h2>

                        <button id="closeGiftContact" class="gc-close" style="
                            background:#333b55;
                            color:white;
                            border:0;
                            padding:10px 15px;
                            border-radius:10px;
                            font-size:18px;
                        ">✕</button>
                    </div>

                    <div class="gc-card" style="
                        background:#1b2238;
                        border-radius:15px;
                        padding:20px;
                        margin-bottom:6px;
                    ">
                        <h3 class="gc-h3" style="margin-top:0;">Order Summary</h3>

                        <div class="gc-sum" style="
                            background:#252c43;
                            padding:15px;
                            border-radius:10px;
                            margin-bottom:18px;
                        ">
                            <b>Package:</b> ${esc(card.name)}<br>
                            <b>Price:</b> ৳${esc(card.selling_price)}
                        </div>

                        <div class="gc-contact" style="
                            background:#20273d;
                            border:2px solid #ff8a00;
                            border-radius:14px;
                            padding:17px;
                            font-size:16px;
                            line-height:1.9;
                        ">
                            <div style="font-weight:bold;">Connect</div>
                            Email :
                            <a href="${esc(mailLink)}"
                               style="color:#ff8a00;word-break:break-all;">${esc(emailNow())}</a><br>
                            Whatsapp :
                            <a href="${esc(waLink)}" target="_blank" rel="noopener"
                               style="color:#ff8a00;">${esc(waShown())}</a>

                            <div class="gc-note" style="
                                color:#9aa3bf;
                                font-size:14px;
                                line-height:1.5;
                                margin-top:10px;
                            ">
                                Message us with the gift card name to buy.
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        if (!giftHistoryPushed) {
            history.pushState({ apexGamer: true, page: "giftContact" }, "", location.href);
            giftHistoryPushed = true;
        }

        document.getElementById("closeGiftContact").onclick = closeGiftContact;
    }

    window.buyGiftCard = async function (giftCardId) {
        try {
            const response = await fetch(API + "/gift-cards");
            if (!response.ok) throw new Error("Failed to load gift cards");

            const cards = await response.json();
            const card = cards.find(function (c) {
                return Number(c.id) === Number(giftCardId);
            });

            if (card) openGiftContact(card);
        } catch (error) {
            console.error("Gift card popup error:", error);
        }
    };
})();
