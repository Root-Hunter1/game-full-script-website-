function apexPackageDisplayName(packageItem, currencyName) {
    const name = packageItem.package_name;
    if (!name) return currencyName + " " + packageItem.amount;
    const amount = Number(packageItem.amount);
    if (!amount) return name;
    const plain = String(packageItem.amount);
    if (String(name).trim().startsWith(plain)) return name;
    return plain + " " + name;
}

function apexEscapeHtml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

const gamesContainer = document.getElementById("gamesContainer");
const gameCount = document.getElementById("gameCount");
const searchInput = document.getElementById("searchInput");

let games = [];
let showingAllGames = false;
const HOME_GAME_LIMIT = 20;
const API = "";

/* ================= GAMES ================= */

async function loadGames() {
    try {
        const response = await fetch(`${API}/games`);

        console.log("status", response.status);

        if (!response.ok) {
            throw new Error("Failed to load games");
        }

        games = await response.json();

        console.log("games response", games);

        showingAllGames = false;
        renderGames(games.slice(0, HOME_GAME_LIMIT));

        const totalGamesCount = document.getElementById("totalGamesCount");
        if (totalGamesCount) totalGamesCount.textContent = `${games.length}`;

    } catch (error) {
        console.error("GAME LOAD ERROR:", error.message, error);

        gamesContainer.innerHTML = `
            <div class="loading">
                Failed to load games.
            </div>
        `;

        if (gameCount) gameCount.textContent = "0 games";
    }
}

function renderGames(gameList) {
    if (gameList === games && !showingAllGames) {
        gameList = games.slice(0, HOME_GAME_LIMIT);
    }

    if (gameCount) gameCount.textContent = `${gameList.length} games`;

    if (gameList.length === 0) {
        gamesContainer.innerHTML = `
            <div class="loading">
                No games found.
            </div>
        `;
        return;
    }

    gamesContainer.innerHTML = gameList.map(game => `
        <article class="game-card">

            <div class="game-image">
                <img
                    src="${game.image_url || ''}"
                    alt="${game.name}"
                    loading="lazy"
                >
            </div>

            <div class="game-info">

                <h3>${game.name}</h3>

                <span class="badge">
                    Available
                </span>

                <button
                    class="game-button"
                    onclick="selectGame(${game.id})"
                >
                    Buy Now
                </button>

            </div>

        </article>
    `).join("");
}


async function selectGame(gameId) {

    const game = games.find(
        game => game.id === gameId
    );

    if (!game) {
        return;
    }

    gamesContainer.innerHTML = `
        <div class="loading">
            Loading ${game.name}...
        </div>
    `;

    try {

        const response = await fetch(
            `${API}/games/${gameId}/currencies`
        );

        if (!response.ok) {
            throw new Error(
                "Failed to load currencies"
            );
        }

        const currencies = await response.json();

        showCurrencies(game, currencies);

    } catch (error) {

        console.error(error);

        gamesContainer.innerHTML = `
            <div class="loading">
                Failed to load currencies.
            </div>
        `;
    }
}

function showCurrencies(game, currencies) {

    if (currencies.length === 0) {
        gamesContainer.innerHTML = `
            <div class="loading">
                No packages available.
            </div>
        `;
        return;
    }

    gamesContainer.innerHTML = `
        <div class="package-view">

            <button
                class="back-games-btn"
                onclick="backToGamesFromPackages(event)"
            >
                ← Back to Games
            </button>

            <h2>${game.name}</h2>

            <div id="packagesContainer">
                ${currencies.map(currency => `
                    <div
                        class="currency-package-section"
                        id="currency-section-${currency.id}"
                    >
                        <h3 class="packages-title">
                            ${currency.name} Packages
                        </h3>

                        <div
                            id="packagesContainer-${currency.id}"
                            class="currency-packages-wrapper"
                        >
                            <div class="loading">
                                Loading ${currency.name} packages...
                            </div>
                        </div>
                    </div>
                `).join("")}
            </div>

        </div>
    `;

    currencies.forEach(currency => {
        loadPackages(
            currency.id,
            currency.name,
            `packagesContainer-${currency.id}`
        );
    });
}


function backToGamesFromPackages(event) {
    if (event) {
        event.preventDefault();
    }

    renderGames(games);

    history.replaceState(
        {
            apexGamer: true,
            page: "games"
        },
        "",
        location.href
    );
}


async function loadPackages(
    currencyId,
    currencyName,
    containerId
) {

    const packagesContainer =
        document.getElementById(containerId);

    if (!packagesContainer) {
        return;
    }

    packagesContainer.innerHTML = `
        <div class="loading">
            Loading ${currencyName}...
        </div>
    `;

    try {

        const response = await fetch(
            `${API}/games/currencies/${currencyId}/packages`
        );

        if (!response.ok) {
            throw new Error("Failed to load packages");
        }

        const packages = await response.json();

        showPackages(
            packages,
            currencyName,
            containerId
        );

    } catch (error) {

        console.error(error);

        packagesContainer.innerHTML = `
            <div class="loading">
                Failed to load ${currencyName} packages.
            </div>
        `;
    }
}


function showPackages(
    packages,
    currencyName,
    containerId
) {

    const packagesContainer =
        document.getElementById(containerId);

    if (!packagesContainer) {
        return;
    }

    if (packages.length === 0) {

        packagesContainer.innerHTML = `
            <div class="loading">
                No ${currencyName} packages available.
            </div>
        `;

        return;
    }

    const VISIBLE_COUNT = 4;
    const hasMore = packages.length > VISIBLE_COUNT;

    packagesContainer.innerHTML = `
        <div class="packages-grid">

            ${packages.map((packageItem, index) => `
                <div class="package-card${index >= VISIBLE_COUNT ? ' package-extra' : ''}"
                     ${index >= VISIBLE_COUNT ? 'style="display:none"' : ''}>

                    <div class="package-info">

                        <div class="package-amount">
                            ${apexEscapeHtml(apexPackageDisplayName(packageItem, currencyName))}
                        </div>

                        <div class="package-price">
                            ৳${packageItem.selling_price}
                        </div>

                    </div>

                    <button
                        class="buy-button"
                        onclick='buyPackage(
                            ${packageItem.id},
                            ${packageItem.amount},
                            ${packageItem.selling_price},
                            ${JSON.stringify(apexPackageDisplayName(packageItem, currencyName)).replace(/&/g, "&amp;").replace(/'/g, "&#39;")}
                        )'
                    >
                        Buy Now
                    </button>

                </div>
            `).join("")}

        </div>

        ${hasMore ? `
            <button
                type="button"
                class="show-more-packages-btn"
                data-expanded="false"
                data-extra="${packages.length - VISIBLE_COUNT}"
                onclick="togglePackages(this)"
            >
                Show More (${packages.length - VISIBLE_COUNT}) ▾
            </button>
        ` : ''}
    `;
}


function togglePackages(button) {

    const wrapper = button.parentElement;
    const extraCards = wrapper.querySelectorAll(".package-extra");
    const expanded = button.dataset.expanded === "true";

    extraCards.forEach(card => {
        card.style.display = expanded ? "none" : "";
    });

    button.dataset.expanded = expanded ? "false" : "true";

    button.textContent = expanded
        ? `Show More (${button.dataset.extra}) ▾`
        : "Show Less ▴";
}


async function buyPackage(packageId, amount, price, label) {

    const packageLabel = label || amount;

    const token = localStorage.getItem("access_token");

    const MAX_QUANTITY = 10;
    let quantity = 1;
    const getTotal = () => Math.round(Number(price) * quantity * 100) / 100;

    /* ================= CHECKOUT UI ================= */

    const oldModal = document.getElementById("apexCheckoutModal");

    if (oldModal) {
        oldModal.remove();
    }

    const modal = document.createElement("div");

    modal.id = "apexCheckoutModal";

    modal.innerHTML = `
        <div style="
            position:fixed;
            inset:0;
            background:#0b1020;
            z-index:99999;
            overflow-y:auto;
            -webkit-overflow-scrolling:touch;
            padding:0;
        ">

            <div style="
                width:100%;
                min-height:100vh;
                box-sizing:border-box;
                background:#0b1020;
                color:white;
                border-radius:0;
                padding:16px 14px 90px;
                box-shadow:none;
            ">

                <div style="
                    display:flex;
                    justify-content:space-between;
                    align-items:center;
                    padding:4px 2px 14px;
                    margin-bottom:6px;
                    border-bottom:1px solid #1f2740;
                ">
                    <div style="display:flex;align-items:center;gap:8px;font-size:20px;font-weight:700;">
                        <img src="apex-logo.png?v=5" alt="ApexGamer"
                            style="height:34px;width:auto;display:block;">
                        <span><strong style="color:#e5e7eb;">Apex</strong><strong style="color:#5b9cff;">Gamer</strong></span>
                    </div>

                    <button id="closeCheckout"
                        style="
                            background:#1b2238;
                            color:white;
                            border:0;
                            width:44px;
                            height:44px;
                            border-radius:12px;
                            font-size:16px;
                            cursor:pointer;
                        ">
                        ✕
                    </button>
                </div>

                <div style="
                    display:flex;
                    justify-content:space-between;
                    align-items:center;
                    margin:14px 0 18px;
                ">
                    <h2 style="
                        margin:0;
                        display:flex;
                        align-items:center;
                        gap:10px;
                        font-size:20px;
                        font-weight:700;
                    ">
                        <span style="
                            background:#ff8a00;
                            border-radius:50%;
                            width:32px;
                            height:32px;
                            display:inline-flex;
                            align-items:center;
                            justify-content:center;
                            font-size:15px;
                        ">2</span>
                        Account Info
                    </h2>

                    <span onclick="apexShowHowTo()" style="color:#ff8a00;font-size:14px;font-weight:600;white-space:nowrap;cursor:pointer;">
                        How to place an order? →
                    </span>
                </div>

                <div style="
                    background:#161c31;
                    border:1px solid #2a3350;
                    border-radius:16px;
                    padding:16px;
                    margin-bottom:18px;
                ">

                    <div style="
                        display:flex;
                        justify-content:space-between;
                        align-items:center;
                        margin-bottom:6px;
                    ">
                        <h3 style="
                            margin:0;
                            font-size:17px;
                            font-weight:600;
                            color:#9aa3b8;
                        ">
                            Order Summary (1)
                        </h3>

                        <button type="button" id="apexClearBtn"
                            style="
                                background:#e53935;
                                color:white;
                                border:0;
                                border-radius:8px;
                                padding:7px 12px;
                                font-size:14px;
                                font-weight:600;
                                cursor:pointer;
                            ">
                            ✕ Clear
                        </button>
                    </div>

                    <div style="
                        display:flex;
                        justify-content:space-between;
                        align-items:center;
                        gap:12px;
                        padding:14px 0;
                        border-top:1px solid #2a3350;
                        border-bottom:1px solid #2a3350;
                    ">
                        <span style="font-size:18px;font-weight:700;">
                            <span id="apexSummaryAmount">${apexEscapeHtml(packageLabel)}</span>
                        </span>

                        <span id="apexSummaryPrice"
                            style="
                                font-size:18px;
                                font-weight:700;
                                color:#ff8a00;
                                white-space:nowrap;
                            ">৳${price}</span>
                    </div>

                    <div style="padding:14px 0 6px;">
                        <label style="
                            display:block;
                            font-size:15px;
                            color:#9aa3b8;
                            margin-bottom:10px;
                        ">
                            Player ID <span style="color:#ff5252;">*</span>
                        </label>

                        <input
                            id="apexPlayerId"
                            type="text"
                            placeholder="আপনার Player ID এখানে দিন"
                            style="
                                width:100%;
                                box-sizing:border-box;
                                padding:16px;
                                border-radius:14px;
                                border:2px solid #ff8a00;
                                background:#20273d;
                                color:white;
                                font-size:16px;
                                -webkit-text-size-adjust:100%;
                                text-size-adjust:100%;
                                outline:none;
                            "
                        >
                    </div>

                    <div style="
                        display:flex;
                        justify-content:space-between;
                        align-items:center;
                        padding:14px 0 4px;
                        margin-top:10px;
                        border-top:1px solid #2a3350;
                    ">
                        <span style="
                            font-size:16px;
                            font-weight:600;
                            color:#9aa3b8;
                        ">
                            Quantity
                        </span>

                        <div style="
                            display:flex;
                            align-items:center;
                            border:1px solid #39425d;
                            border-radius:12px;
                            overflow:hidden;
                            background:#20273d;
                        ">
                            <button type="button" id="apexQtyMinus" aria-label="Decrease quantity"
                                style="background:transparent;color:white;border:0;width:44px;height:44px;font-size:22px;font-weight:bold;line-height:1;cursor:pointer;opacity:.5;">−</button>
                            <span id="apexQtyValue" style="
                                min-width:48px;
                                text-align:center;
                                font-size:18px;
                                font-weight:bold;
                                line-height:44px;
                                border-left:1px solid #39425d;
                                border-right:1px solid #39425d;
                            ">1</span>
                            <button type="button" id="apexQtyPlus" aria-label="Increase quantity"
                                style="background:transparent;color:white;border:0;width:44px;height:44px;font-size:22px;font-weight:bold;line-height:1;cursor:pointer;">+</button>
                        </div>
                    </div>
                </div>

                <button
                    id="goPaymentBtn"
                    disabled
                    style="
                        width:100%;
                        padding:18px;
                        border:0;
                        border-radius:15px;
                        background:#ff8a00;
                        color:white;
                        font-size:19px;
                        font-weight:bold;
                        opacity:.5;
                    "
                >
                    Go to Payment — ৳${price}
                </button>

                <div id="paymentSection"
                    style="display:none;margin-top:20px;">

                    <h2>3. Payment</h2>

                    <div id="walletOption" style="
                        background:#20273d;
                        border:2px solid #39425d;
                        border-radius:14px;
                        padding:17px;
                        margin-bottom:10px;
                        cursor:pointer;
                    ">
                        💳 Wallet Pay
                    </div>

                    <div id="manualOption" style="
                        background:#20273d;
                        border:2px solid #39425d;
                        border-radius:14px;
                        padding:17px;
                        cursor:pointer;
                    ">
                        📱 Manual Payment
                    </div>

                    <div id="manualPaymentBox"
                        style="display:none;margin-top:15px;">

                        <input
                            id="paymentMethod"
                            type="text"
                            placeholder="Payment Method (bKash/Nagad/Rocket/USDT)"
                            style="
                                width:100%;
                                box-sizing:border-box;
                                padding:15px;
                                margin-bottom:10px;
                                border-radius:10px;
                                border:1px solid #555;
                                background:#20273d;
                                color:white;
                            "
                        >

    			<input
                            id="customerEmail"
      			    type="email"
			    placeholder="Your Gmail Address"
			    required
			    style="
		                width:100%;
			        box-sizing:border-box;
			        padding:15px;
			        margin-bottom:10px;
			        border-radius:10px;
			        border:1px solid #555;
			        background:#20273d;
			        color:white;
			        font-size:16px;
                            -webkit-text-size-adjust:100%;
                            text-size-adjust:100%;
                            "
     			>

                        <input
                            id="transactionId"
                            type="text"
                            placeholder="Transaction ID"
                            style="
                                width:100%;
                                box-sizing:border-box;
                                padding:15px;
                                border-radius:10px;
                                border:1px solid #555;
                                background:#20273d;
                                color:white;
                            "
                        >

                    </div>

                    <button
                        id="confirmPaymentBtn"
                        style="
                            width:100%;
                            padding:18px;
                            margin-top:18px;
                            border:0;
                            border-radius:15px;
                            background:#0d6efd;
                            color:white;
                            font-size:18px;
                            font-weight:bold;
                        "
                    >
                        Confirm Payment
                    </button>

                </div>

            </div>
        </div>
    `;

    document.documentElement.appendChild(modal);

    /* ================= FULL SCREEN STYLE ================= */

    if (!document.getElementById("apexCheckoutFullStyle")) {
        const bodyCs = getComputedStyle(document.body);
        const styleEl = document.createElement("style");
        styleEl.id = "apexCheckoutFullStyle";
        styleEl.textContent =
            "#apexCheckoutModal { font-family: " + bodyCs.fontFamily + " !important;" +
            " font-size: " + bodyCs.fontSize + " !important;" +
            " line-height: " + bodyCs.lineHeight + " !important; }" +
            "#apexCheckoutModal button, #apexCheckoutModal input { font-family: inherit !important; }" +
            "#apexCheckoutModal * { font-size: 14px !important; line-height: 1.3 !important; }" +
            "#apexCheckoutModal h2 { font-size: 18px !important; }" +
            "#apexCheckoutModal h3 { font-size: 14px !important; }" +
            "#apexCheckoutModal [style*=\"gap:8px\"] strong { font-size: 22px !important; line-height: 1.1 !important; }" +
            "#goPaymentBtn { padding: 12px 16px !important; font-size: 16px !important; border-radius: 12px !important; }" +
            "#paymentSection { zoom: 0.85 !important; }" +
            "#paymentSection * { font-size: 16px !important; }" +
            "#paymentSection h2, #paymentSection h3 { font-size: 20px !important; }" +
            "#apexCheckoutModal, #apexCheckoutModal * { max-width: none !important; min-width: 0 !important; }" +
            "#apexCheckoutModal > div { position: fixed !important; inset: 0 !important; padding: 0 !important; margin: 0 !important; width: 100vw !important; }" +
            "#apexCheckoutModal > div > div {" +
            " position: fixed !important; top: 0 !important; left: 0 !important;" +
            " right: 0 !important; bottom: 0 !important;" +
            " zoom: 0.85 !important;" +
            " margin: 0 !important; padding: 16px 14px 90px !important;" +
            " border-radius: 0 !important; box-shadow: none !important;" +
            " box-sizing: border-box !important; background: #0b1020 !important;" +
            " overflow-y: auto !important; -webkit-overflow-scrolling: touch !important;" +
            " transform: none !important; z-index: 1 !important; }";
        document.head.appendChild(styleEl);
    }

    /* ================= ELEMENTS ================= */

    const playerInput =
        document.getElementById("apexPlayerId");

    const goPaymentBtn =
        document.getElementById("goPaymentBtn");

    const paymentSection =
        document.getElementById("paymentSection");

    const walletOption =
        document.getElementById("walletOption");

    const manualOption =
        document.getElementById("manualOption");

    const manualPaymentBox =
        document.getElementById("manualPaymentBox");

    const confirmPaymentBtn =
        document.getElementById("confirmPaymentBtn");

    let selectedPayment = null;

    /* ================= QUANTITY ================= */

    const qtyMinus = document.getElementById("apexQtyMinus");
    const qtyPlus = document.getElementById("apexQtyPlus");
    const qtyValue = document.getElementById("apexQtyValue");
    const summaryAmount = document.getElementById("apexSummaryAmount");
    const summaryPrice = document.getElementById("apexSummaryPrice");

    function resetPaymentStep() {
        paymentSection.style.display = "none";
        selectedPayment = null;
        walletOption.style.border = "2px solid #39425d";
        manualOption.style.border = "2px solid #39425d";
        manualPaymentBox.style.display = "none";
        walletOption.innerHTML = "💳 Wallet Pay";
        confirmPaymentBtn.disabled = false;
        confirmPaymentBtn.innerText = "Confirm Payment";
    }

    function updateQuantityUI() {
        qtyValue.textContent = quantity;
        qtyMinus.style.opacity = quantity <= 1 ? ".5" : "1";
        qtyPlus.style.opacity = quantity >= MAX_QUANTITY ? ".5" : "1";
        summaryAmount.textContent =
            quantity > 1 ? `${packageLabel} × ${quantity}` : `${packageLabel}`;
        summaryPrice.textContent = `৳${getTotal()}`;
        goPaymentBtn.textContent = `Go to Payment — ৳${getTotal()}`;
    }

    function changeQuantity(delta) {
        const next = quantity + delta;
        if (next < 1 || next > MAX_QUANTITY) {
            return;
        }
        quantity = next;
        updateQuantityUI();
        // total changed, so payment step must be chosen again
        if (paymentSection.style.display === "block") {
            resetPaymentStep();
        }
    }

    qtyMinus.onclick = () => changeQuantity(-1);
    qtyPlus.onclick = () => changeQuantity(1);

    document.getElementById("apexClearBtn").onclick = () => {
        playerInput.value = "";
        playerInput.dispatchEvent(new Event("input"));
    };

    /* ================= CLOSE ================= */

    document.getElementById("closeCheckout")
        .onclick = () => modal.remove();

    /* ================= PLAYER ID ================= */

    playerInput.addEventListener("input", () => {

        const valid =
            playerInput.value.trim().length > 0;

        goPaymentBtn.disabled = !valid;

        goPaymentBtn.style.opacity =
            valid ? "1" : ".5";
    });

    /* ================= GO PAYMENT ================= */

    goPaymentBtn.onclick = () => {

        const playerId =
            playerInput.value.trim();

        if (!playerId) {
            alert("Player ID দিন।");
            return;
        }

        paymentSection.style.display = "block";

        paymentSection.scrollIntoView({
            behavior: "smooth"
        });
    };

    /* ================= WALLET ================= */

    walletOption.onclick = async () => {

        if (!token) {
            closeLoginRequired();
            openLogin();
            return;
        }

    selectedPayment = "wallet";

    walletOption.style.border =
        "2px solid #ff8a00";

    manualOption.style.border =
        "2px solid #39425d";

    manualPaymentBox.style.display =
        "none";

    walletOption.innerHTML = `
        <div style="
            font-size:18px;
            font-weight:bold;
        ">
            💳 Wallet Payment
        </div>

        <div id="walletInfo" style="
            margin-top:12px;
            padding:14px;
            background:#171d31;
            border-radius:10px;
            line-height:1.8;
        ">
            Loading wallet balance...
        </div>
    `;

    try {

        const response = await fetch(`${API}/wallet`, {
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(
                data.detail ||
                "Wallet balance পাওয়া যায়নি"
            );
        }

        const balance =
            Number(data.wallet_balance || 0);

        const remaining =
            Math.round((balance - getTotal()) * 100) / 100;

        document.getElementById("walletInfo").innerHTML = `
            <div>
                Wallet Balance:
                <b>৳${balance}</b>
            </div>

            <div>
                Order Amount:
                <b>৳${getTotal()}</b>
            </div>

            <div>
                Remaining Balance:
                <b style="
                    color:${remaining >= 0
                        ? '#35d07f'
                        : '#ff5252'};
                ">
                    ৳${remaining}
                </b>
            </div>

            ${
                remaining >= 0
                ? `
                    <div style="
                        margin-top:10px;
                        color:#35d07f;
                        font-weight:bold;
                    ">
                        ✅ আপনি ApexGamer Wallet দিয়ে
                        payment করছেন
                    </div>
                `
                : `
                    <div style="
                        margin-top:10px;
                        color:#ff5252;
                        font-weight:bold;
                    ">
                        ❌ Wallet balance যথেষ্ট নয়
                    </div>
                `
            }
        `;

        if (remaining >= 0) {

            confirmPaymentBtn.disabled = false;

            confirmPaymentBtn.innerText =
                `Pay ৳${getTotal()} from Wallet`;

        } else {

            confirmPaymentBtn.disabled = true;

            confirmPaymentBtn.innerText =
                "Insufficient Wallet Balance";
        }

    } catch (error) {

        document.getElementById("walletInfo").innerHTML = `
            <div style="color:#ff5252;">
                ❌ ${error.message}
            </div>
        `;

        confirmPaymentBtn.disabled = true;
    }
};


/* ================= MANUAL PAYMENT ================= */

manualOption.onclick = () => {

    selectedPayment = "manual";

    loadPaymentAccounts();

    manualOption.style.border =
        "2px solid #ff8a00";

    walletOption.style.border =
        "2px solid #39425d";

    manualPaymentBox.style.display =
        "block";

    confirmPaymentBtn.disabled = false;

    confirmPaymentBtn.innerText =
        "Confirm Payment";

    setTimeout(() => {
        confirmPaymentBtn.scrollIntoView({
            behavior: "auto",
            block: "end"
        });
    }, 80);
};

    /* ================= CONFIRM ================= */

    confirmPaymentBtn.onclick = async () => {

        const playerId =
            playerInput.value.trim();

        if (!playerId) {
            alert("Player ID দিন।");
            return;
        }

        if (!selectedPayment) {
            alert("একটি Payment Method নির্বাচন করুন।");
            return;
        }

        confirmPaymentBtn.disabled = true;
        confirmPaymentBtn.innerText =
            "Processing...";

        try {

            /* ================= CREATE ORDER ================= */

            const orderUrl =
                `${API}/orders?package_id=${encodeURIComponent(packageId)}` +
                `&player_id=${encodeURIComponent(playerId)}` +
                `&quantity=${quantity}`;

            const orderResponse =
                await fetch(orderUrl, {
                    method: "POST",
                    headers: token
                        ? {
                            "Authorization":
                                `Bearer ${token}`
                        }
                        : {}
                });

            const orderData =
                await orderResponse.json();

            if (!orderResponse.ok) {
                throw new Error(
                    orderData.detail ||
                    "Order তৈরি করা যায়নি"
                );
            }

            const orderId =
                orderData.order_id;

            /* ================= WALLET ================= */

            if (selectedPayment === "wallet") {

                const walletResponse =
                    await fetch(
                        `${API}/orders/${orderId}/wallet-payment`,
                        {
                            method: "POST",
                            headers: {
                                "Authorization":
                                    `Bearer ${token}`
                            }
                        }
                    );

                const walletData =
                    await walletResponse.json();

                if (!walletResponse.ok) {
                    throw new Error(
                        walletData.detail ||
                        "Wallet payment failed"
                    );
                }

                showPaymentSuccess(
                    walletData.order_id || orderId,
                    playerId,
                    walletData.status || "processing"
                );

                modal.remove();

                return;
            }

            /* ================= MANUAL PAYMENT ================= */

            const paymentMethod =
                document
                    .getElementById("paymentMethod")
                    .value
                    .trim();

            const transactionId =
                document
                    .getElementById("transactionId")
                    .value
                    .trim();
            
            const customerEmail =
                document
                    .getElementById("customerEmail")
                    .value
                    .trim();

            if (!customerEmail) {
                throw new Error("Email Address দিন।");
            }

            if (!paymentMethod) {
                throw new Error(
                    "Payment Method দিন।"
                );
            }

            if (!transactionId) {
                throw new Error(
                    "Transaction ID দিন।"
                );
            }

            const paymentUrl =
     	        `/orders/${orderId}/payment` +
	        `?payment_method=${encodeURIComponent(paymentMethod)}` +
	        `&transaction_id=${encodeURIComponent(transactionId)}` +
	        `&customer_email=${encodeURIComponent(customerEmail)}`;

            const paymentResponse =
                await fetch(
                    `${API}${paymentUrl}`,
                    {
                        method: "POST"
           	    }
	        );

            const paymentData =
                await paymentResponse.json();

            if (!paymentResponse.ok) {
                throw new Error(
                    paymentData.detail ||
                    "Payment failed"
                );
            }

            showPaymentSuccess(
                paymentData.order_id || orderId,
	        playerId,
                paymentData.order_status || "processing"
            );

            modal.remove();
            return;
        } catch (error) {

            console.error(error);

            showPaymentError(
                error.message ||
                "Something went wrong."
            );

            confirmPaymentBtn.disabled = false;
            confirmPaymentBtn.innerText =
                "Confirm Payment";
        }
    };
}

/* ================= SEARCH ================= */

(function () {

    const searchBox = searchInput?.parentElement;

    if (!searchInput || !searchBox) {
        return;
    }

    searchBox.style.position = "relative";

    let suggestionBox =
        document.getElementById("gameSearchSuggestions");

    if (!suggestionBox) {
        suggestionBox = document.createElement("div");
        suggestionBox.id = "gameSearchSuggestions";

        searchBox.appendChild(suggestionBox);
    }

    function showSuggestions(list) {

        if (!list.length) {
            suggestionBox.innerHTML = `
                <div class="search-no-result">
                    No game found
                </div>
            `;

            suggestionBox.style.display = "block";
            return;
        }

        suggestionBox.innerHTML = list
            .slice(0, 6)
            .map(game => `
                <div
                    class="search-suggestion"
                    onclick="selectSearchGame(${game.id})"
                >
                    <img
                        src="${game.image_url || ''}"
                        alt=""
                    >

                    <span>${game.name}</span>
                </div>
            `)
            .join("");

        suggestionBox.style.display = "block";
    }


    window.selectSearchGame = function (gameId) {

        const game = games.find(
            game => game.id === Number(gameId)
        );

        if (!game) {
            return;
        }

        searchInput.value = game.name;

        suggestionBox.style.display = "none";

        // শুধু selected game দেখাবে
        renderGames([game]);

        // Games section-এ নিয়ে যাবে
        setTimeout(() => {

            const section =
                document.getElementById("gamesContainer");

            if (section) {
                section.scrollIntoView({
                    behavior: "smooth",
                    block: "start"
                });
            }

        }, 100);

    };


    searchInput.addEventListener("input", function () {

        const searchText =
            this.value.toLowerCase().trim();

        if (!searchText) {

            suggestionBox.style.display = "none";

            renderGames(games);

            return;
        }

        const filteredGames =
            games.filter(game =>
                game.name
                    .toLowerCase()
                    .includes(searchText)
            );

        showSuggestions(filteredGames);

        // exact/single match হলে সরাসরি শুধু সেই game দেখাবে
        if (filteredGames.length === 1) {

            renderGames(filteredGames);

            setTimeout(() => {

                const section =
                    document.getElementById("gamesContainer");

                if (section) {
                    section.scrollIntoView({
                        behavior: "smooth",
                        block: "start"
                    });
                }

            }, 150);
        }

    });


    // বাইরে click করলে suggestion বন্ধ
    document.addEventListener("click", function (event) {

        if (!searchBox.contains(event.target)) {
            suggestionBox.style.display = "none";
        }

    });

})();


/* ================= GIFT CARDS ================= */

async function loadPopularProducts() {

    try {

        const response = await fetch(
            `${API}/gift-cards`
        );

        if (!response.ok) {
            throw new Error(
                "Failed to load gift cards"
            );
        }

        const products = await response.json();

        renderPopularProducts(products);

    } catch (error) {

        console.error("Gift Cards Error:", error);

    }
}


function renderPopularProducts(products) {

    const productsGrid =
        document.querySelector(".products-grid");

    if (!productsGrid) {
        return;
    }

    productsGrid.innerHTML =
        products.map(product => `
            <div class="product-card">

                <div class="product-image">
                    <img
                        src="${product.image_url}"
                        alt="${product.name}"
                        loading="lazy"
                    >
                </div>

                <h3>
                    ${product.name}
                </h3>

                <p>
                    Gift Card
                </p>

                <strong>
                    ৳${product.selling_price}
                </strong>

                <button
                    onclick="buyGiftCard(${product.id})"
                >
                    Buy Now
                </button>

            </div>
        `).join("");
}


function buyGiftCard(giftCardId) {

    console.log(
        "Gift Card selected:",
        giftCardId
    );

}

/* ================= AUTH ================= */

const loginModal =
    document.getElementById("loginModal");

const loginForm =
    document.getElementById("loginForm");

const signupForm =
    document.getElementById("signupForm");

const loginMessage =
    document.getElementById("loginMessage");

const authTitle =
    document.getElementById("authTitle");

const authSubtitle =
    document.getElementById("authSubtitle");

const switchText =
    document.getElementById("switchText");

const switchAuth =
    document.getElementById("switchAuth");


let authMode = "login";


function openLogin() {

    if (!loginModal) {
        return;
    }

    authMode = "login";

    updateAuthForm();

    loginModal.style.display = "flex";
}


function closeLogin() {

    if (!loginModal) {
        return;
    }

    loginModal.style.display = "none";

    if (loginMessage) {
        loginMessage.textContent = "";
    }
}


function updateAuthForm() {

    if (loginMessage) {
        loginMessage.textContent = "";
    }

    if (authMode === "login") {

        authTitle.textContent =
            "Welcome to ApexGamer";

        authSubtitle.textContent =
            "Login to continue";

        loginForm.style.display =
            "flex";

        signupForm.style.display =
            "none";

        switchText.textContent =
            "Don't have an account?";

        switchAuth.textContent =
            "Sign Up";

    } else {

        authTitle.textContent =
            "Create ApexGamer Account";

        authSubtitle.textContent =
            "Create your account to continue";

        loginForm.style.display =
            "none";

        signupForm.style.display =
            "flex";

        switchText.textContent =
            "Already have an account?";

        switchAuth.textContent =
            "Login";
    }
}


if (switchAuth) {

    switchAuth.addEventListener(
        "click",
        function () {

            if (authMode === "login") {
                authMode = "signup";
            } else {
                authMode = "login";
            }

            updateAuthForm();
        }
    );

}


/* Header Login buttons */

document
    .querySelectorAll(".login-btn, .nav-login")
    .forEach(button => {

        button.addEventListener(
            "click",
            openLogin
        );

    });


/* ================= LOGIN ================= */

if (loginForm) {

    loginForm.addEventListener(
        "submit",
        async function (event) {

            event.preventDefault();

            const email =
                document.getElementById(
                    "loginEmail"
                ).value.trim();

            const password =
                document.getElementById(
                    "loginPassword"
                ).value;


            loginMessage.textContent =
                "Logging in...";


            try {

                /*
                 * Current backend accepts:
                 * /auth/login?email=...&password=...
                 */

                const loginBody = new URLSearchParams();

                loginBody.append("username", email);
                loginBody.append("password", password);

		const response = await fetch(
		    `${API}/auth/login`,
                    {

                        method: "POST",
                        headers: {
                            "Content-Type": "application/x-www-form-urlencoded"
                        },
                        body: loginBody.toString()
                     } 
                );
                
                const data =
                    await response.json();


                if (!response.ok) {

                    throw new Error(
                        data.detail ||
                        "Login failed"
                    );
                }


                localStorage.setItem(
                    "access_token",
                    data.access_token
                );


                loginMessage.textContent =
                    "Login successful!";


                setTimeout(
                    closeLogin,
                    800
                );


            } catch (error) {

                console.error(error);

                loginMessage.textContent =
                    error.message;
            }

        }
    );

}


/* ================= SIGNUP ================= */

if (signupForm) {

    signupForm.addEventListener(
        "submit",
        async function (event) {

            event.preventDefault();

            const name =
                document.getElementById(
                    "signupName"
                ).value.trim();

            const email =
                document.getElementById(
                    "signupEmail"
                ).value.trim();

            const password =
                document.getElementById(
                    "signupPassword"
                ).value;


            loginMessage.textContent =
                "Creating account...";


            try {

                const response =
                    await fetch(
                        "/users",
                        {
                            method: "POST",

                            headers: {
                                "Content-Type":
                                    "application/json"
                            },

                            body: JSON.stringify({
                                name: name,
                                email: email,
                                password: password
                            })
                        }
                    );


                const rawResponse =
                    await response.text();

                let data = {};

                try {
                    data = rawResponse
                        ? JSON.parse(rawResponse)
                        : {};
                } catch (e) {
                    throw new Error(
                        rawResponse ||
                        "Server returned an invalid response"
                    );
                }


                if (!response.ok) {

                    throw new Error(
                        data.detail ||
                        data.message ||
                        "Signup failed"
                    );
                }


                loginMessage.textContent =
                    "Account created! Please login.";


                setTimeout(
                    function () {

                        authMode = "login";

                        updateAuthForm();

                        document.getElementById(
                            "loginEmail"
                        ).value = email;

                    },
                    1000
                );


            } catch (error) {

                console.error(error);

                loginMessage.textContent =
                    error.message;
            }

        }
    );

}


/* ================= START ================= */

console.log("START TEST"); loadGames();
loadPopularProducts();

function openAdminPanel() {
    const token = localStorage.getItem("access_token");

    if (!token) {
        alert("Please login first.");
        return;
    }

    window.location.href = "/admin.html";
}

function goHome(event) {
    if (event) event.preventDefault();
    if (document.body.classList.contains("all-games-mode")) exitAllGames();
    window.scrollTo({ top: 0, behavior: "smooth" });
}

function goGames(event) {
    if (event) event.preventDefault();
    const el = document.querySelector(".games-section")
        || document.querySelector("#games")
        || document.querySelector(".games-grid");

    if (el) {
        el.scrollIntoView({ behavior: "smooth" });
    }
}

function maskWalletNumber(number) {
    return String(number || "");
}

async function openWallet(event) {
    if (event) event.preventDefault();

    const token = localStorage.getItem("access_token");

    if (!token) {
        closeLoginRequired();
        openLogin();
        return;
    }

    try {
        /* ================= WALLET BALANCE ================= */

        const response = await fetch(`${API}/wallet`, {
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });

        const data = await response.json();

        if (!response.ok) {
            if (response.status === 401) {
                localStorage.removeItem("access_token");
                showLoginExpiredPopup();
                return;
            }

            throw new Error(
                data.detail || "Wallet load করা যায়নি"
            );
        }

        const balance = Number(data.wallet_balance || 0);

        /* ================= PAYMENT ACCOUNTS ================= */

        let accounts = [];

        try {
            const accountResponse =
                await fetch(`${API}/payment-accounts`);

            if (accountResponse.ok) {
                accounts = await accountResponse.json();
            }
        } catch (e) {
            console.log("Payment accounts load failed", e);
        }

        const methodNames = ["bKash", "Nagad", "Rocket", "USDT"];

        const availableAccounts = methodNames.map(method => {
            return accounts.find(
                a =>
                    String(a.method || "").toLowerCase() ===
                    method.toLowerCase()
            );
        }).filter(Boolean);

        let selectedAccount =
            availableAccounts[0] || null;

        const accountHTML = availableAccounts.length
            ? availableAccounts.map((account, index) => `
                <button
                    type="button"
                    class="wallet-payment-card ${index === 0 ? "active" : ""}"
                    data-method="${account.method}"
                    data-account="${account.account_number}"
                    data-type="${account.account_type || ""}"
                    data-network="${account.network || ""}"
                    style="
                        width:100%;
                        display:flex;
                        align-items:center;
                        gap:12px;
                        padding:12px;
                        margin-bottom:10px;
                        border-radius:14px;
                        border:2px solid ${index === 0 ? "#1683ff" : "#263653"};
                        background:${index === 0 ? "#102d50" : "#121d32"};
                        color:white;
                        text-align:left;
                        cursor:pointer;
                        box-sizing:border-box;
                    "
                >
                    <div style="
                        width:44px;
                        height:44px;
                        min-width:44px;
                        border-radius:12px;
                        background:#fff;
                        display:flex;
                        align-items:center;
                        justify-content:center;
                        overflow:hidden;
                    ">
                        ${
                            account.image_url
                            ? `<img
                                src="${account.image_url}"
                                alt="${account.method}"
                                style="
                                    width:38px;
                                    height:38px;
                                    object-fit:contain;
                                "
                            >`
                            : "💳"
                        }
                    </div>

                    <div style="
                        flex:1;
                        min-width:0;
                    ">
                        <div style="
                            font-size:16px;
                            -webkit-text-size-adjust:100%;
                            text-size-adjust:100%;
                            font-weight:800;
                            margin-bottom:3px;
                        ">
                            ${account.method}
                        </div>

                        <div style="
                            color:#91a4c2;
                            font-size:13px;
                        ">
                            ${account.account_type || ""}
                            ${account.network ? " • " + account.network : ""}
                        </div>
                    </div>

                    <div style="
                        font-size:20px;
                        color:${index === 0 ? "#1683ff" : "#667895"};
                    ">
                        ${index === 0 ? "✓" : "○"}
                    </div>
                </button>
            `).join("")
            : `
                <div style="
                    padding:14px;
                    border-radius:12px;
                    background:#171f33;
                    color:#9aa9c0;
                    text-align:center;
                ">
                    Payment accounts unavailable
                </div>
            `;

        const html = `
            <div id="walletModal" style="
                position:fixed;
                inset:0;
                z-index:99999;
                background:rgba(3,8,20,.82);
                backdrop-filter:blur(6px);
                -webkit-backdrop-filter:blur(6px);
                overflow-y:auto;
                padding:14px;
                box-sizing:border-box;
            ">

                <div style="
                    width:100%;
                    max-width:520px;
                    margin:18px auto;
                    background:#0c1428;
                    color:#fff;
                    border:1px solid #263653;
                    border-radius:24px;
                    overflow:hidden;
                    box-shadow:0 25px 80px rgba(0,0,0,.55);
                ">

                    <!-- HEADER -->
                    <div style="
                        padding:20px;
                        display:flex;
                        align-items:center;
                        justify-content:space-between;
                        border-bottom:1px solid #202d46;
                        background:linear-gradient(135deg,#101d37,#0b1427);
                    ">

                        <div style="
                            display:flex;
                            align-items:center;
                            gap:12px;
                        ">
                            <div style="
                                width:48px;
                                height:48px;
                                border-radius:14px;
                                background:linear-gradient(135deg,#1683ff,#35b6ff);
                                display:flex;
                                align-items:center;
                                justify-content:center;
                                font-size:25px;
                            ">
                                💳
                            </div>

                            <div>
                                <div style="
                                    font-size:23px;
                                    font-weight:900;
                                    line-height:1.1;
                                ">
                                    My Wallet
                                </div>

                                <div style="
                                    color:#8ea0bc;
                                    font-size:13px;
                                    margin-top:4px;
                                ">
                                    Manage your ApexGamer balance
                                </div>
                            </div>
                        </div>

                        <button
                            type="button"
                            onclick="document.getElementById('walletModal').remove()"
                            style="
                                width:42px;
                                height:42px;
                                border:0;
                                border-radius:12px;
                                background:#202b42;
                                color:#fff;
                                font-size:22px;
                                cursor:pointer;
                            "
                        >
                            ✕
                        </button>
                    </div>


                    <!-- BALANCE -->
                    <div style="
                        margin:18px;
                        padding:22px;
                        border-radius:20px;
                        background:
                            linear-gradient(
                                135deg,
                                #0c3d78,
                                #0754a5,
                                #0875d9
                            );
                        position:relative;
                        overflow:hidden;
                    ">

                        <div style="
                            position:absolute;
                            width:150px;
                            height:150px;
                            right:-50px;
                            top:-60px;
                            border-radius:50%;
                            background:rgba(255,255,255,.08);
                        "></div>

                        <div style="
                            color:#b9d9ff;
                            font-size:14px;
                            font-weight:700;
                        ">
                            AVAILABLE BALANCE
                        </div>

                        <div style="
                            font-size:36px;
                            font-weight:900;
                            margin-top:8px;
                            letter-spacing:.3px;
                        ">
                            ৳${balance.toLocaleString("en-BD")}
                        </div>

                        <div style="
                            margin-top:12px;
                            color:#d9ecff;
                            font-size:13px;
                        ">
                            Use your wallet for faster game top-ups
                        </div>
                    </div>


                    <!-- ADD MONEY -->
                    <div style="
                        padding:0 18px 20px;
                    ">

                        <div style="
                            display:flex;
                            align-items:center;
                            gap:9px;
                            margin-bottom:12px;
                        ">
                            <span style="
                                width:30px;
                                height:30px;
                                border-radius:9px;
                                background:#123d68;
                                display:flex;
                                align-items:center;
                                justify-content:center;
                            ">
                                +
                            </span>

                            <div style="
                                font-size:19px;
                                font-weight:800;
                            ">
                                Add Money
                            </div>
                        </div>

                        <div style="
                            color:#8495b1;
                            font-size:13px;
                            margin-bottom:14px;
                        ">
                            Select a payment method and send money to the account below.
                        </div>


                        <!-- PAYMENT METHODS -->
                        <div id="walletPaymentAccounts">
                            ${accountHTML}
                        </div>


                        <!-- SELECTED ACCOUNT -->
                        <div id="walletSelectedAccount" style="
                            margin-top:12px;
                            padding:15px;
                            border-radius:16px;
                            background:#101d32;
                            border:1px solid #263653;
                        ">

                            ${
                                selectedAccount
                                ? `
                                    <div style="
                                        color:#8ea0bc;
                                        font-size:12px;
                                        margin-bottom:6px;
                                    ">
                                        SEND MONEY TO
                                    </div>

                                    <div style="
                                        display:flex;
                                        align-items:center;
                                        gap:8px;
                                    ">

                                        <div id="walletAccountNumber" style="
                                            flex:1;
                                            font-size:21px;
                                            font-weight:900;
                                            letter-spacing:.5px;
                                            word-break:break-all;
                                        ">
                                            ${selectedAccount.account_number}
                                        </div>

                                        <button
                                            type="button"
                                            id="walletCopyBtn"
                                            style="
                                                border:0;
                                                background:#1683ff;
                                                color:#fff;
                                                padding:9px 12px;
                                                border-radius:9px;
                                                font-weight:700;
                                                cursor:pointer;
                                            "
                                        >
                                            📋 Copy
                                        </button>
                                    </div>

                                    <div style="
                                        margin-top:7px;
                                        color:#7f91ae;
                                        font-size:12px;
                                    ">
                                        ${selectedAccount.account_type || ""}
                                        ${selectedAccount.network ? " • " + selectedAccount.network : ""}
                                    </div>
                                `
                                : `
                                    <div style="color:#8ea0bc;">
                                        Payment account not available.
                                    </div>
                                `
                            }

                        </div>


                        <!-- AMOUNT -->
                        <label style="
                            display:block;
                            margin-top:16px;
                            margin-bottom:7px;
                            font-size:13px;
                            font-weight:700;
                            color:#b7c4d8;
                        ">
                            Amount
                        </label>

                        <div style="position:relative;">
                            <span style="
                                position:absolute;
                                left:14px;
                                top:50%;
                                transform:translateY(-50%);
                                color:#7e91ad;
                                font-weight:700;
                            ">
                                ৳
                            </span>

                            <input
                                id="walletAmount"
                                type="number"
                                min="1"
                                inputmode="decimal"
                                placeholder="Enter amount"
                                style="
                                    width:100%;
                                    height:52px;
                                    padding:0 14px 0 34px;
                                    border-radius:13px;
                                    border:1px solid #2a3a57;
                                    background:#111d32;
                                    color:#fff;
                                    outline:none;
                                    font-size:16px;
                            -webkit-text-size-adjust:100%;
                            text-size-adjust:100%;
                                    box-sizing:border-box;
                                "
                            >
                        </div>


                        <!-- TRANSACTION ID -->
                        <label style="
                            display:block;
                            margin-top:14px;
                            margin-bottom:7px;
                            font-size:13px;
                            font-weight:700;
                            color:#b7c4d8;
                        ">
                            Transaction ID / TXID
                        </label>

                        <input
                            id="walletTransactionId"
                            type="text"
                            autocomplete="off"
                            placeholder="Enter transaction ID"
                            style="
                                width:100%;
                                height:52px;
                                padding:0 14px;
                                border-radius:13px;
                                border:1px solid #2a3a57;
                                background:#111d32;
                                color:#fff;
                                outline:none;
                                font-size:16px;
                            -webkit-text-size-adjust:100%;
                            text-size-adjust:100%;
                                box-sizing:border-box;
                            "
                        >


                        <!-- SUBMIT -->
                        <button
                            type="button"
                            onclick="submitWalletDeposit()"
                            style="
                                width:100%;
                                height:54px;
                                margin-top:16px;
                                border:0;
                                border-radius:14px;
                                background:linear-gradient(135deg,#087cff,#1267db);
                                color:#fff;
                                font-size:16px;
                            -webkit-text-size-adjust:100%;
                            text-size-adjust:100%;
                                font-weight:900;
                                cursor:pointer;
                                box-shadow:0 8px 25px rgba(8,124,255,.25);
                            "
                        >
                            Submit Deposit
                        </button>


                        <div style="
                            margin-top:13px;
                            padding:11px;
                            border-radius:11px;
                            background:#101a2d;
                            color:#71839f;
                            text-align:center;
                            font-size:12px;
                            line-height:1.5;
                        ">
                            🛡️ Deposit requests are reviewed and approved by ApexGamer Admin.
                        </div>

                    </div>

                </div>
            </div>
        `;

        document.body.insertAdjacentHTML("beforeend", html);


        /* ================= PAYMENT METHOD CLICK ================= */

        const cards =
            document.querySelectorAll(
                "#walletPaymentAccounts .wallet-payment-card"
            );

        const selectedBox =
            document.getElementById(
                "walletSelectedAccount"
            );

        cards.forEach(card => {

            card.addEventListener("click", () => {

                cards.forEach(c => {
                    c.classList.remove("active");
                    c.style.border = "2px solid #263653";
                    c.style.background = "#121d32";

                    const icon = c.querySelector(":scope > div:last-child");

                    if (icon) {
                        icon.style.color = "#667895";
                        icon.textContent = "○";
                    }
                });

                card.classList.add("active");

                card.style.border =
                    "2px solid #1683ff";

                card.style.background =
                    "#102d50";

                const icon =
                    card.querySelector(":scope > div:last-child");

                if (icon) {
                    icon.style.color = "#1683ff";
                    icon.textContent = "✓";
                }

                const method =
                    card.dataset.method || "";

                const account =
                    card.dataset.account || "";

                const type =
                    card.dataset.type || "";

                const network =
                    card.dataset.network || "";

                selectedAccount = {
                    method,
                    account_number: account,
                    account_type: type,
                    network
                };

                selectedBox.innerHTML = `
                    <div style="
                        color:#8ea0bc;
                        font-size:12px;
                        margin-bottom:6px;
                    ">
                        SEND MONEY TO
                    </div>

                    <div style="
                        display:flex;
                        align-items:center;
                        gap:8px;
                    ">
                        <div
                            id="walletAccountNumber"
                            style="
                                flex:1;
                                font-size:21px;
                                font-weight:900;
                                word-break:break-all;
                            "
                        >
                            ${account}
                        </div>

                        <button
                            type="button"
                            id="walletCopyBtn"
                            style="
                                border:0;
                                background:#1683ff;
                                color:#fff;
                                padding:9px 12px;
                                border-radius:9px;
                                font-weight:700;
                                cursor:pointer;
                            "
                        >
                            📋 Copy
                        </button>
                    </div>

                    <div style="
                        margin-top:7px;
                        color:#7f91ae;
                        font-size:12px;
                    ">
                        ${type}
                        ${network ? " • " + network : ""}
                    </div>
                `;

                setupWalletCopy();
            });
        });


        /* ================= COPY ================= */

        function setupWalletCopy() {

            const copyBtn =
                document.getElementById(
                    "walletCopyBtn"
                );

            if (!copyBtn) return;

            copyBtn.onclick = async () => {

                const number =
                    document.getElementById(
                        "walletAccountNumber"
                    )?.textContent.trim();

                if (!number) return;

                try {
                    await navigator.clipboard.writeText(number);

                    copyBtn.textContent = "✓ Copied";

                    setTimeout(() => {
                        copyBtn.textContent = "📋 Copy";
                    }, 1500);

                } catch (e) {
                    alert("Copy করা যায়নি।");
                }
            };
        }

        setupWalletCopy();

    } catch (error) {

        console.error(error);

        alert(
            "❌ " +
            (error.message || "Wallet load করা যায়নি")
        );
    }
}



function showLoginExpiredPopup() {
    const old = document.getElementById("loginExpiredPopup");
    if (old) old.remove();

    const modal = document.createElement("div");
    modal.id = "loginExpiredPopup";

    modal.innerHTML = `
        <div style="
            position:fixed;
            inset:0;
            background:rgba(0,0,0,.65);
            backdrop-filter:blur(4px);
            z-index:1000000;
            display:flex;
            align-items:center;
            justify-content:center;
            padding:20px;
        ">
            <div style="
                width:100%;
                max-width:380px;
                background:#111c35;
                color:white;
                border:1px solid #263d63;
                border-radius:20px;
                padding:26px 22px;
                text-align:center;
                box-shadow:0 20px 60px rgba(0,0,0,.5);
            ">
                <div style="
                    width:62px;
                    height:62px;
                    margin:0 auto 15px;
                    border-radius:50%;
                    background:#17345f;
                    display:flex;
                    align-items:center;
                    justify-content:center;
                    font-size:30px;
                ">
                    🔐
                </div>

                <h2 style="
                    margin:0 0 10px;
                    font-size:22px;
                ">
                    Login Required
                </h2>

                <p style="
                    margin:0 0 22px;
                    color:#aebbd1;
                    line-height:1.5;
                    font-size:15px;
                ">
                    Your login session has expired.
                    Please login again to continue.
                </p>

                <div style="
                    display:flex;
                    gap:10px;
                ">
                    <button id="expiredCancelBtn" style="
                        flex:1;
                        min-height:48px;
                        border:1px solid #34496b;
                        border-radius:11px;
                        background:#1a2740;
                        color:white;
                        font-size:15px;
                        cursor:pointer;
                    ">
                        Cancel
                    </button>

                    <button id="expiredLoginBtn" style="
                        flex:1;
                        min-height:48px;
                        border:0;
                        border-radius:11px;
                        background:#087cff;
                        color:white;
                        font-size:15px;
                        font-weight:700;
                        cursor:pointer;
                    ">
                        Login Now
                    </button>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    document.getElementById("expiredCancelBtn").onclick = () => {
        modal.remove();
    };

    document.getElementById("expiredLoginBtn").onclick = () => {
        modal.remove();

        const loginModal =
            document.getElementById("loginModal");

        if (loginModal) {
            loginModal.style.display = "flex";
        } else if (typeof openLogin === "function") {
            openLogin();
        }
    };
}

async function submitWalletDeposit() {
    const token = localStorage.getItem("access_token");

    if (!token) {
        alert("Wallet deposit করতে আগে Login করুন।");
        return;
    }

    const amountInput = document.getElementById("walletAmount");
    const transactionInput = document.getElementById("walletTransactionId");

    const selectedCard = document.querySelector(
        "#walletPaymentAccounts .wallet-payment-card.active"
    );

    const amount = amountInput ? amountInput.value.trim() : "";
    const transactionId = transactionInput
        ? transactionInput.value.trim()
        : "";

    const paymentMethod = selectedCard
        ? selectedCard.dataset.method
        : "";

    if (!amount || Number(amount) <= 0) {
        alert("সঠিক amount দিন।");
        if (amountInput) amountInput.focus();
        return;
    }

    if (!paymentMethod) {
        alert("একটি payment method নির্বাচন করুন।");
        return;
    }

    if (!transactionId) {
        alert("Transaction ID / TXID দিন।");
        if (transactionInput) transactionInput.focus();
        return;
    }

    const submitBtn = document.querySelector(
        "#walletModal button[onclick='submitWalletDeposit()']"
    );

    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerText = "Submitting...";
        submitBtn.style.opacity = "0.7";
    }

    try {
        const url =
            `${API}/wallet/deposit` +
            `?amount=${encodeURIComponent(amount)}` +
            `&payment_method=${encodeURIComponent(paymentMethod)}` +
            `&transaction_id=${encodeURIComponent(transactionId)}`;

        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(
                data.detail || "Deposit request failed"
            );
        }

        const walletModal = document.getElementById("walletModal");
        if (walletModal) {
            walletModal.remove();
        }

        showResultPopup({
            type: "success",
            title: "Deposit Request Submitted",
            message: "Your payment will be verified shortly. " +
                     "Balance is added right after approval.",
            rows: [
                ["Amount", "৳" + data.amount],
                ["Method", paymentMethod],
                ["Transaction ID", data.transaction_id],
            ],
            status: data.status,
        });

    } catch (error) {
        console.error("Wallet deposit error:", error);

        showResultPopup({
            type: "error",
            title: "Deposit Failed",
            message: error.message || "Unknown error",
            rows: [],
        });

        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerText = "Submit Deposit";
            submitBtn.style.opacity = "1";
        }
    }
}

async function openOrders(event) {
    if (event) event.preventDefault();

    const token = localStorage.getItem("access_token");

    if (!token) {
        closeLoginRequired();
        openLogin();
        return;
    }

    try {
        const response = await fetch(`${API}/orders`, {
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.detail || "Orders load করা যায়নি");
        }

        if (!document.getElementById("apexOrdersStyle")) {
            const st = document.createElement("style");
            st.id = "apexOrdersStyle";
            st.textContent = `
@media (max-width: 600px) {
    #apexOrdersOverlay {
        box-sizing: border-box !important;
        padding: 8px !important;
        overflow-x: hidden !important;
    }
    #apexOrdersOverlay * {
        box-sizing: border-box;
        font-size: 11px !important;
        overflow-wrap: anywhere;
    }
    #apexOrdersOverlay > div {
        margin: 16px auto !important;
        padding: 10px !important;
        border-radius: 12px !important;
    }
    #apexOrdersOverlay > div > div:first-child {
        margin-bottom: 8px !important;
    }
    #apexOrdersOverlay h2 {
        font-size: 14px !important;
    }
    #apexOrdersOverlay button {
        padding: 3px 8px !important;
        font-size: 11px !important;
    }
    #apexOrdersOverlay > div > div:not(:first-child) {
        padding: 9px !important;
        margin-bottom: 8px !important;
        border-radius: 9px !important;
        line-height: 1.4 !important;
    }
    #apexOrdersOverlay [style*="font-size:40px"] {
        font-size: 26px !important;
    }
}`;
            document.head.appendChild(st);
        }

        let html = `
            <div id="apexOrdersOverlay" style="
                position:fixed;
                inset:0;
                background:rgba(0,0,0,.75);
                z-index:99999;
                padding:20px;
                overflow:auto;
            ">
                <div style="
                    max-width:700px;
                    margin:40px auto;
                    background:#111827;
                    border-radius:16px;
                    padding:20px;
                    color:white;
                ">

                    <div style="
                        display:flex;
                        justify-content:space-between;
                        align-items:center;
                        margin-bottom:20px;
                    ">
                        <h2 style="margin:0;">📋 My Orders</h2>

                        <button
                            onclick="this.closest('div[style*=fixed]').remove()"
                            style="
                                background:#ff5252;
                                color:white;
                                border:0;
                                border-radius:8px;
                                padding:8px 14px;
                                font-size:16px;
                            -webkit-text-size-adjust:100%;
                            text-size-adjust:100%;
                            "
                        >
                            ✕
                        </button>
                    </div>
        `;

        if (!data.length) {
            html += `
                <div style="
                    text-align:center;
                    padding:40px 10px;
                    color:#aaa;
                ">
                    <div style="font-size:40px;">📦</div>
                    <p>আপনার এখনো কোনো order নেই।</p>
                </div>
            `;
        } else {
            data.forEach(order => {
                html += `
                    <div style="
                        background:#1b2338;
                        border:1px solid #303a55;
                        border-radius:12px;
                        padding:16px;
                        margin-bottom:12px;
                    ">

                        <div style="
                            display:flex;
                            justify-content:space-between;
                            gap:10px;
                            margin-bottom:10px;
                        ">
                            <b style="color:#ff9d2e;">
                                ${order.public_order_id || "APX-ORDER"}
                            </b>

                            <b style="
    color:${
        order.status === "completed"
            ? "#35d07f"
            : order.status === "processing"
            ? "#4da6ff"
            : order.status === "delivery_failed"
            ? "#ff5252"
            : order.status === "paid"
            ? "#35d07f"
            : "#ffc107"
    };
">
    ${
        order.status === "completed"
            ? "Completed"
            : order.status === "processing"
            ? "Processing"
            : order.status === "delivery_failed"
            ? "Delivery Failed"
            : order.status === "paid"
            ? "Payment Successful"
            : "Pending"
    }
</b>
                            
                        </div>

                        <div>🎮 Game: <b>${order.game_name}</b></div>

                        <div>👤 Player ID: <b>${order.player_id}</b></div>

                        <div>💎 Amount: <b>${apexEscapeHtml(order.package_label || order.package_amount)}</b></div>

                        <div>💰 Price: <b>৳${order.price}</b></div>

                        <div>
                            💳 Payment:
                            <b>${order.payment_method || "Pending"}</b>
                        </div>

                        <div>
                            🚚 Delivery:
                            <b>${order.supplier_status || "Pending"}</b>
                        </div>

                    </div>
                `;
            });
        }

        html += `
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML("beforeend", html);

    } catch (error) {
        alert("❌ " + error.message);
    }
}

async function loadPaymentAccounts() {

    try {

        const response =
            await fetch(`${API}/payment-accounts`);

        const accounts =
            await response.json();

        const box =
            document.getElementById("manualPaymentBox");

        if (!box) return;

        if (!Array.isArray(accounts) || accounts.length === 0) {

            box.innerHTML = `
                <div class="payment-empty">
                    No payment method available.
                </div>
            `;

            return;
        }

        const paymentOrder = [
            "bKash",
            "Nagad",
            "Rocket",
            "USDT"
        ];

        accounts.sort((a, b) => {

            const ai =
                paymentOrder.indexOf(a.method);

            const bi =
                paymentOrder.indexOf(b.method);

            return (
                (ai === -1 ? 999 : ai) -
                (bi === -1 ? 999 : bi)
            );
        });

        box.innerHTML = `

            <input
                type="hidden"
                id="paymentMethod"
            >

            <div class="payment-method-title">
                <span>Choose Payment Method</span>
                <small>Select one</small>
            </div>

            <div class="payment-method-grid">

                ${accounts.map((a, index) => {

                    let icon = a.image_url || "";

                    return `

                        <button
                            type="button"
                            class="payment-method-card"
                            data-index="${index}"
                        >

                            <span class="payment-check">
                                ✓
                            </span>

                            <span class="payment-method-icon">
				<img
 			            src="${icon}"
			            alt="${a.method}"
				>
			    </span>

                            <span class="payment-method-name">
                                ${a.method}
                            </span>

                        </button>

                    `;

                }).join("")}

            </div>

            <div
                id="selectedPaymentDetails"
                class="selected-payment-details"
            >
                <div class="payment-placeholder">
                    <div>💳</div>
                    <span>
                        Select a payment method
                    </span>
                </div>
            </div>

            <input
                id="transactionId"
                type="text"
                placeholder="Transaction ID / TXID"
                class="payment-input"
            >

            <input
                id="customerEmail"
                type="email"
                placeholder="Your Gmail Address"
                class="payment-input"
            >

        `;

        const methodCards =
            box.querySelectorAll(
                ".payment-method-card"
            );

        methodCards.forEach((card, index) => {

            card.addEventListener("click", () => {

                selectPaymentAccount(
                    accounts[index].method,
                    accounts[index].account_number,
                    accounts[index].account_type || "",
                    accounts[index].network || "",
                    accounts[index].image_url || "",
                    card
                );

            });

        });

    } catch (error) {

        console.error(
            "Payment accounts error:",
            error
        );

        const box =
            document.getElementById(
                "manualPaymentBox"
            );

        if (box) {

            box.innerHTML = `
                <div class="payment-error">
                    ❌ Payment methods load করা যায়নি।
                </div>
            `;

        }

    }
}


function selectPaymentAccount(
    method,
    accountNumber,
    accountType,
    network,
    imageUrl,
    selectedCard
) {

    const methodInput =
        document.getElementById(
            "paymentMethod"
        );

    const details =
        document.getElementById(
            "selectedPaymentDetails"
        );

    if (!methodInput || !details) {
        return;
    }

    methodInput.value = method;

    document
        .querySelectorAll(
            ".payment-method-card"
        )
        .forEach(card => {

            card.classList.remove(
                "selected"
            );

        });

    selectedCard.classList.add(
        "selected"
    );

    details.innerHTML = `

        <div class="selected-payment-header">

            <div class="selected-payment-icon">

                <img
                   src="${imageUrl}"
                   alt="${method}"
                >

            </div>

            <div>

                <strong>
                    ${method}
                </strong>

                <span>
                    Send Money To
                </span>

            </div>

        </div>

        <div class="payment-account-row">

            <strong>
                ${accountNumber}
            </strong>

            <button
                type="button"
                class="payment-copy-btn"
                onclick="
                    copyPayment(
                        '${accountNumber}',
                        this
                    )
                "
            >
                📋 Copy
            </button>

        </div>

        <div class="payment-meta">

            ${accountType
                ? `<span>${accountType}</span>`
                : ""
            }

            ${network
                ? `<span>${network}</span>`
                : ""
            }

        </div>

    `;

}

function copyPayment(number, button) {
    const textarea = document.createElement("textarea");
    textarea.value = number;
    document.body.appendChild(textarea);

    textarea.select();
    document.execCommand("copy");
    textarea.remove();

    const oldToast = document.querySelector(".copy-success-toast");
    if (oldToast) oldToast.remove();

    const toast = document.createElement("div");

    toast.className = "copy-success-toast";

    toast.innerHTML = `
        <span style="
            font-size:18px;
            color:#22c55e;
            font-weight:bold;
        ">✓</span>

        <span style="
            font-weight:600;
        ">Copied Successfully</span>
    `;

    Object.assign(toast.style, {
        position: "absolute",
        background: "#111827",
        color: "#ffffff",
        padding: "9px 14px",
        borderRadius: "10px",
        fontSize: "14px",
        boxShadow: "0 6px 20px rgba(0,0,0,.35)",
        display: "flex",
        alignItems: "center",
        gap: "7px",
        zIndex: "999999",
        border: "1px solid #22c55e",
        whiteSpace: "nowrap",
        opacity: "0",
        transform: "translateY(5px)",
        transition: "all .2s ease"
    });

    document.body.appendChild(toast);

    const rect = button.getBoundingClientRect();

    toast.style.left =
        (window.scrollX + rect.left) + "px";

    toast.style.top =
        (window.scrollY + rect.top - toast.offsetHeight - 8) + "px";

    requestAnimationFrame(() => {
        toast.style.opacity = "1";
        toast.style.transform = "translateY(0)";
    });

    setTimeout(() => {
        toast.style.opacity = "0";
        toast.style.transform = "translateY(5px)";

        setTimeout(() => {
            toast.remove();
        }, 200);
    }, 1500);
}

function showPaymentSuccess(orderId, playerId, status) {
    const oldModal = document.getElementById("paymentSuccessModal");

    if (oldModal) {
        oldModal.remove();
    }

    const modal = document.createElement("div");

    modal.id = "paymentSuccessModal";

    modal.innerHTML = `
        <div class="success-overlay">
            <div class="success-box">

                <div class="success-icon">
                    ✓
                </div>

                <h2>Payment Submitted!</h2>

                <p class="success-subtitle">
                    Your payment has been successfully submitted.
                </p>

                <div class="success-details">

                    <div class="success-row">
                        <span>Order ID</span>
                        <strong>#${orderId}</strong>
                    </div>

                    <div class="success-row">
                        <span>Player ID</span>
                        <strong>${playerId}</strong>
                    </div>

                    <div class="success-row">
                        <span>Status</span>
                        <strong class="status-processing">
                            ${status}
                        </strong>
                    </div>

                </div>

                <button
                    class="success-close"
                    onclick="closePaymentSuccess()"
                >
                    Done
                </button>

            </div>
        </div>
    `;

    document.body.appendChild(modal);
}


function closePaymentSuccess() {
    const modal = document.getElementById("paymentSuccessModal");

    if (modal) {
        modal.remove();
    }
}

function showPaymentError(message) {

    const oldModal =
        document.getElementById("paymentErrorModal");

    if (oldModal) {
        oldModal.remove();
    }

    const modal =
        document.createElement("div");

    modal.id = "paymentErrorModal";

    modal.innerHTML = `
        <div class="error-overlay">
            <div class="error-box">

                <div class="error-icon">
                    !
                </div>

                <h2>Payment Failed</h2>

                <p class="error-subtitle">
                    ${message}
                </p>

                <div class="error-help">
                    Please check your Transaction ID
                    and try again.
                </div>

                <button
                    class="error-close"
                    onclick="closePaymentError()"
                >
                    Try Again
                </button>

            </div>
        </div>
    `;

    document.body.appendChild(modal);
}


function closePaymentError() {

    const modal =
        document.getElementById("paymentErrorModal");

    if (modal) {
        modal.remove();
    }
}

function showLoginRequired() {

    const oldModal =
        document.getElementById("loginRequiredModal");

    if (oldModal) {
        oldModal.remove();
    }

    const modal = document.createElement("div");

    modal.id = "loginRequiredModal";

    modal.innerHTML = `
        <div class="login-required-overlay">

            <div class="login-required-box">

                <div class="login-required-icon">
                    🔐
                </div>

                <h2>Login Required</h2>

                <p>
                    Wallet ব্যবহার করতে আগে
                    আপনার account-এ Login করুন।
                </p>

                <div class="login-required-actions">

                    <button
                        class="login-required-login"
                        onclick="closeLoginRequired(); openLogin();"
                    >
                        Login
                    </button>

                    <button
                        class="login-required-cancel"
                        onclick="closeLoginRequired()"
                    >
                        Cancel
                    </button>

                </div>

            </div>

        </div>
    `;

    document.body.appendChild(modal);
}


function closeLoginRequired() {

    const modal =
        document.getElementById("loginRequiredModal");

    if (modal) {
        modal.remove();
    }
}

// ================= SUPPORT =================

function openSupport(event) {

    if (event) {
        event.preventDefault();
    }

    // Remove old popup if already exists
    const oldPopup = document.getElementById("supportModal");

    if (oldPopup) {
        oldPopup.remove();
    }

    document.body.insertAdjacentHTML("beforeend", `

        <div
            id="supportModal"
            style="
                position:fixed;
                inset:0;
                background:rgba(0,0,0,0.65);
                display:flex;
                align-items:center;
                justify-content:center;
                z-index:99999;
                padding:15px;
                box-sizing:border-box;
            "
        >

            <div
                style="
                    width:100%;
                    max-width:520px;
                    max-height:90vh;
                    overflow-y:auto;
                    background:#10182d;
                    color:white;
                    border-radius:16px;
                    padding:20px;
                    box-sizing:border-box;
                    box-shadow:0 20px 60px rgba(0,0,0,.4);
                "
            >

                <div
                    style="
                        display:flex;
                        justify-content:space-between;
                        align-items:center;
                        margin-bottom:18px;
                    "
                >

                    <h2 style="margin:0;">
                        🎧 Support
                    </h2>

                    <button
                        onclick="document.getElementById('supportModal').remove()"
                        style="
                            border:none;
                            background:#263452;
                            color:white;
                            width:38px;
                            height:38px;
                            border-radius:50%;
                            font-size:22px;
                            cursor:pointer;
                        "
                    >
                        ×
                    </button>

                </div>


                <p
                    style="
                        color:#b8c2d9;
                        margin-top:0;
                        line-height:1.5;
                    "
                >
                    Payment করেছেন কিন্তু order/product পাননি?
                    নিচের তথ্য দিয়ে Support Request পাঠান।
                </p>


                <label style="display:block;margin:12px 0 6px;">
                    Order ID
                </label>

                <input
                    id="supportOrderId"
                    type="text"
                    placeholder="Enter Order ID"
                    style="
                        width:100%;
                        box-sizing:border-box;
                        padding:13px;
                        border-radius:8px;
                        border:1px solid #39425d;
                        background:#1b2338;
                        color:white;
                    "
                >


                <label style="display:block;margin:12px 0 6px;">
                    Email
                </label>

                <input
                    id="supportEmail"
                    type="email"
                    placeholder="Your email address"
                    style="
                        width:100%;
                        box-sizing:border-box;
                        padding:13px;
                        border-radius:8px;
                        border:1px solid #39425d;
                        background:#1b2338;
                        color:white;
                    "
                >


                <label style="display:block;margin:12px 0 6px;">
                    Payment Method
                </label>

                <select
                    id="supportPaymentMethod"
                    style="
                        width:100%;
                        box-sizing:border-box;
                        padding:13px;
                        border-radius:8px;
                        border:1px solid #39425d;
                        background:#1b2338;
                        color:white;
                    "
                >

                    <option value="">
                        Select payment method
                    </option>

                    <option value="bKash">
                        bKash
                    </option>

                    <option value="Nagad">
                        Nagad
                    </option>

                    <option value="Rocket">
                        Rocket
                    </option>

                    <option value="USDT">
                        USDT
                    </option>

                    <option value="Wallet">
                        Wallet
                    </option>

                </select>


                <label style="display:block;margin:12px 0 6px;">
                    Transaction ID
                </label>

                <input
                    id="supportTransactionId"
                    type="text"
                    placeholder="Enter Transaction ID"
                    style="
                        width:100%;
                        box-sizing:border-box;
                        padding:13px;
                        border-radius:8px;
                        border:1px solid #39425d;
                        background:#1b2338;
                        color:white;
                    "
                >


                <label style="display:block;margin:12px 0 6px;">
                    Problem
                </label>

                <textarea
                    id="supportMessage"
                    rows="5"
                    placeholder="Describe your problem..."
                    style="
                        width:100%;
                        box-sizing:border-box;
                        padding:13px;
                        border-radius:8px;
                        border:1px solid #39425d;
                        background:#1b2338;
                        color:white;
                        resize:vertical;
                    "
                ></textarea>


                <label style="display:block;margin:12px 0 6px;">
                    Payment Screenshot / Document
                </label>

                <input
                    id="supportDocument"
                    type="file"
                    accept="image/*,.pdf"
                    style="
                        width:100%;
                        box-sizing:border-box;
                        padding:10px;
                        border-radius:8px;
                        border:1px solid #39425d;
                        background:#1b2338;
                        color:white;
                    "
                >


                <button
                    id="supportSubmitBtn"
                    onclick="submitSupportRequest()"
                    style="
                        width:100%;
                        margin-top:18px;
                        border:none;
                        background:#1468ff;
                        color:white;
                        padding:14px;
                        border-radius:9px;
                        font-size:16px;
                            -webkit-text-size-adjust:100%;
                            text-size-adjust:100%;
                        font-weight:bold;
                        cursor:pointer;
                    "
                >
                    Submit Support Request
                </button>

                <div style="margin-top:10px;text-align:center;color:#8fa0bc;font-size:13px;">
                    অথবা সরাসরি আমাদের সাথে কথা বলুন
                </div>

                <a
                    href="https://wa.me/+8800000000000"
                    target="_blank"
                    rel="noopener noreferrer"
                    style="
                        display:flex;
                        align-items:center;
                        justify-content:center;
                        gap:8px;
                        width:100%;
                        margin-top:10px;
                        padding:12px 16px;
                        box-sizing:border-box;
                        border-radius:11px;
                        background:#25D366;
                        color:#ffffff;
                        text-decoration:none;
                        font-size:15px;
                        font-weight:700;
                    "
                >
                    <span style="font-size:20px;">💬</span>
                    WhatsApp Support
                </a>

            </div>

        </div>

    `);
}


// ================= SUBMIT SUPPORT REQUEST =================

/* ApexGamer styled popup (replaces browser alert in Support form) */
function showSupportAlert(message, type, focusId) {
    const old = document.getElementById("supportAlertModal");
    if (old) old.remove();

    const isError = type === "error";
    const accent = isError ? "239,68,68" : "245,158,11";
    const icon = isError ? "✕" : "!";
    const title = isError ? "Request Failed" : "তথ্য প্রয়োজন • Required";

    const overlay = document.createElement("div");
    overlay.id = "supportAlertModal";
    overlay.style.cssText =
        "position:fixed;inset:0;z-index:100001;display:flex;align-items:center;" +
        "justify-content:center;padding:20px;box-sizing:border-box;" +
        "background:rgba(3,8,20,.72);backdrop-filter:blur(6px);";

    const box = document.createElement("div");
    box.style.cssText =
        "width:100%;max-width:390px;background:#0d172d;" +
        "border:1px solid rgba(" + accent + ",.3);border-radius:22px;" +
        "padding:30px 24px 24px;box-sizing:border-box;text-align:center;" +
        "box-shadow:0 25px 80px rgba(0,0,0,.55);";

    const iconEl = document.createElement("div");
    iconEl.textContent = icon;
    iconEl.style.cssText =
        "width:72px;height:72px;margin:0 auto 18px;border-radius:50%;" +
        "display:flex;align-items:center;justify-content:center;" +
        "background:rgba(" + accent + ",.14);border:1px solid rgba(" + accent + ",.3);" +
        "font-size:38px;font-weight:800;color:rgb(" + accent + ");";

    const titleEl = document.createElement("h2");
    titleEl.textContent = title;
    titleEl.style.cssText = "margin:0 0 10px;color:#ffffff;line-height:1.3;font-weight:700;";
    titleEl.style.setProperty("font-size", "23px", "important");
    titleEl.style.setProperty("-webkit-text-size-adjust", "100%", "important");
    titleEl.style.setProperty("text-size-adjust", "100%", "important");

    const msgEl = document.createElement("p");
    msgEl.textContent = message;
    msgEl.style.cssText =
        "margin:0 0 24px;color:#aebbd2;font-size:15px;line-height:1.6;" +
        "white-space:pre-line;word-break:break-word;";

    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = "OK";
    btn.style.cssText =
        "width:100%;padding:13px 18px;border:0;border-radius:11px;" +
        "background:#1468ff;color:#ffffff;font-size:16px;font-weight:700;" +
        "cursor:pointer;";

    function close() {
        overlay.remove();
        if (focusId) {
            const el = document.getElementById(focusId);
            if (el) el.focus();
        }
    }

    btn.onclick = close;
    overlay.addEventListener("click", function (e) {
        if (e.target === overlay) close();
    });

    box.appendChild(iconEl);
    box.appendChild(titleEl);
    box.appendChild(msgEl);
    box.appendChild(btn);
    overlay.appendChild(box);
    document.body.appendChild(overlay);
}

async function submitSupportRequest() {

    const orderId = document.getElementById("supportOrderId")?.value.trim();
    const email = document.getElementById("supportEmail")?.value.trim();
    const paymentMethod = document.getElementById("supportPaymentMethod")?.value;
    const transactionId = document.getElementById("supportTransactionId")?.value.trim();
    const problem = document.getElementById("supportMessage")?.value.trim();
    const documentFile = document.getElementById("supportDocument")?.files?.[0];
    const button = document.getElementById("supportSubmitBtn");

    if (!orderId) {
        showSupportAlert("Order ID দিন।\nPlease enter your Order ID.", "warn", "supportOrderId");
        return;
    }

    if (!email) {
        showSupportAlert("আপনার Email দিন।\nPlease enter your email address.", "warn", "supportEmail");
        return;
    }

    if (!paymentMethod) {
        showSupportAlert("Payment Method select করুন।\nPlease select a payment method.", "warn", "supportPaymentMethod");
        return;
    }

    if (!problem) {
        showSupportAlert("আপনার Problem লিখুন।\nPlease describe your problem.", "warn", "supportMessage");
        return;
    }

    const formData = new FormData();

    formData.append("order_id", orderId);
    formData.append("customer_email", email);
    formData.append("payment_method", paymentMethod);
    formData.append("transaction_id", transactionId || "");
    formData.append("problem", problem);

    if (documentFile) {
        formData.append("document", documentFile);
    }

    button.disabled = true;
    button.textContent = "Sending...";

    try {

        const response = await fetch(`${API}/support`, {
            method: "POST",
            body: formData
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.detail || "Support request failed");
        }

        // Modern ApexGamer success popup
        const oldSuccess = document.getElementById("supportSuccessModal");

        if (oldSuccess) {
            oldSuccess.remove();
        }

        document.body.insertAdjacentHTML("beforeend", `
            <div
                id="supportSuccessModal"
                style="
                    position:fixed;
                    inset:0;
                    z-index:100000;
                    display:flex;
                    align-items:center;
                    justify-content:center;
                    padding:20px;
                    box-sizing:border-box;
                    background:rgba(3,8,20,.72);
                    backdrop-filter:blur(6px);
                "
            >
                <div
                    style="
                        width:100%;
                        max-width:390px;
                        background:#0d172d;
                        border:1px solid rgba(59,130,246,.25);
                        border-radius:22px;
                        padding:30px 24px 24px;
                        box-sizing:border-box;
                        text-align:center;
                        box-shadow:0 25px 80px rgba(0,0,0,.55);
                    "
                >

                    <div
                        style="
                            width:72px;
                            height:72px;
                            margin:0 auto 18px;
                            border-radius:50%;
                            display:flex;
                            align-items:center;
                            justify-content:center;
                            background:rgba(34,197,94,.14);
                            border:1px solid rgba(34,197,94,.3);
                            font-size:38px;
                        "
                    >
                        ✓
                    </div>

                    <h2
                        style="
                            margin:0 0 10px;
                            color:#ffffff;
                            font-size:23px;
                            font-weight:800;
                        "
                    >
                        Support Request Sent!
                    </h2>

                    <p
                        style="
                            margin:0 0 24px;
                            color:#aebbd2;
                            font-size:15px;
                            line-height:1.6;
                        "
                    >
                        আপনার report সফলভাবে আমাদের কাছে পৌঁছেছে।
                        আমরা বিষয়টি review করব।
                    </p>

                    <button
                        type="button"
                        onclick="
                            document.getElementById('supportSuccessModal')?.remove();
                            document.getElementById('supportModal')?.remove();
                        "
                        style="
                            width:100%;
                            padding:13px 18px;
                            border:0;
                            border-radius:11px;
                            background:#1468ff;
                            color:#ffffff;
                            font-size:16px;
                            -webkit-text-size-adjust:100%;
                            text-size-adjust:100%;
                            font-weight:700;
                            cursor:pointer;
                        "
                    >
                        Done
                    </button>

                </div>
            </div>
        `);

    } catch (error) {

        console.error("Support request error:", error);

        showSupportAlert(
            "Support Request পাঠানো যায়নি।\nFailed to send your support request.\n\n" + error.message,
            "error"
        );

        button.disabled = false;
        button.textContent = "Submit Support Request";
    }
}

function openSafeSecure(event) {
    if (event) event.preventDefault();

    const oldModal = document.getElementById("safeSecureModal");
    if (oldModal) oldModal.remove();

    const modal = document.createElement("div");
    modal.id = "safeSecureModal";

    modal.innerHTML = `
        <div style="
            position:fixed;
            inset:0;
            z-index:99999;
            background:rgba(0,0,0,.65);
            backdrop-filter:blur(7px);
            display:flex;
            align-items:center;
            justify-content:center;
            padding:20px;
            box-sizing:border-box;
        "
        onclick="if(event.target===this) this.parentElement.remove()">

            <div style="
                position:relative;
                width:100%;
                max-width:430px;
                background:#111c2e;
                color:#fff;
                border-radius:20px;
                padding:24px;
                box-sizing:border-box;
                box-shadow:0 20px 60px rgba(0,0,0,.45);
                border:1px solid rgba(255,255,255,.08);
            ">

                <button id="safeSecureClose"
                    aria-label="Close"
                    onclick="document.getElementById('safeSecureModal').remove()"
                    style="
                        position:absolute;
                        top:1px !important; margin:0 !important; padding:0 !important;
                        right:1px !important;
                        width:36px;
                        height:36px;
                        border:0;
                        border-radius:50%;
                        background:#2a3b5e;
                        color:#fff;
                        font-size:18px;
                        line-height:1;
                        cursor:pointer;
                        display:flex;
                        align-items:center;
                        justify-content:center;
                    ">✕</button>

                <div style="
                    width:58px;
                    height:58px;
                    border-radius:16px;
                    background:#fff3d6;
                    display:flex;
                    align-items:center;
                    justify-content:center;
                    font-size:30px;
                    margin-bottom:16px;
                ">
                    🛡️
                </div>

                <h2 style="
                    margin:0 0 10px;
                    font-size:22px;
                ">
                    Safe & Secure
                </h2>

                <p style="
                    margin:0 0 12px;
                    color:#4da3ff;
                    font-size:16px;
                            -webkit-text-size-adjust:100%;
                            text-size-adjust:100%;
                    font-weight:700;
                    line-height:1.5;
                ">
                    ApexGamer — Fast, reliable & secure gaming top-ups.
                </p>

                <p style="
                    margin:0;
                    color:#b8c5d8;
                    font-size:14px;
                    line-height:1.7;
                ">
                    Your payment and order information are handled securely.
                    We provide a simple and reliable gaming top-up experience
                    with trusted payment options and customer support.
                </p>

                <div style="
                    margin-top:20px;
                    display:grid;
                    gap:10px;
                ">
                    <div style="
                        padding:12px 14px;
                        border-radius:12px;
                        background:#18283e;
                        font-size:14px;
                    ">
                        ✓ Secure Payment
                    </div>

                    <div style="
                        padding:12px 14px;
                        border-radius:12px;
                        background:#18283e;
                        font-size:14px;
                    ">
                        ✓ Fast Delivery
                    </div>

                    <div style="
                        padding:12px 14px;
                        border-radius:12px;
                        background:#18283e;
                        font-size:14px;
                    ">
                        ✓ 24/7 Customer Support
                    </div>
                </div>

                <button
                    onclick="document.getElementById('safeSecureModal').remove()"
                    style="
                        width:100%;
                        margin-top:20px;
                        padding:13px;
                        border:none;
                        border-radius:11px;
                        background:#1468ff;
                        color:#fff;
                        font-size:15px;
                        font-weight:700;
                        cursor:pointer;
                    "
                >
                    Got it
                </button>

            </div>
        </div>
    `;

    document.body.appendChild(modal);
}


function toggleAllGamesMenu(event) {
    event.stopPropagation();

    const menu = document.getElementById("allGamesMenu");
    if (!menu) return;

    menu.style.display =
        menu.style.display === "block" ? "none" : "block";
}

function showAllGames(event) {
    if (event) event.preventDefault();
    if (event) event.stopPropagation();

    var wasAllGames = document.body.classList.contains("all-games-mode");
    showingAllGames = true;
    document.body.classList.add("all-games-mode");
    ensureAllGamesBar();
    if (!wasAllGames) {
        history.pushState({ apexGamer: true, page: "games" }, "", location.href);
    }

    if (typeof renderGames === "function") {
        renderGames(games);
    }

    const gamesSection = document.getElementById("gamesContainer");

    if (gamesSection) {
        gamesSection.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });
    }
}


/* =========================================================
   APEXGAMER UNIVERSAL BACK / FORWARD NAVIGATION
   ========================================================= */

(function () {
    "use strict";

    if (window.__apexUniversalHistory) {
        return;
    }

    window.__apexUniversalHistory = true;

    let restoring = false;

    /*
     * Initial page = Home
     */
    if (!history.state || !history.state.apexGamer) {
        history.replaceState(
            {
                apexGamer: true,
                page: "home"
            },
            "",
            location.href
        );
    }

    function pushPage(page, data = {}) {
        if (restoring) return;

        history.pushState(
            {
                apexGamer: true,
                page,
                ...data
            },
            "",
            location.href
        );
    }

    function closeOpenModals() {

        const ids = [
            "supportModal",
            "safeSecureModal",
            "apexOrdersOverlay",
            "walletModal",
            "paymentSuccessModal",
            "authModal",
            "apexProfileOverlay"
        ];

        ids.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.remove();
        });

        /*
         * Checkout modal does not have a fixed known ID,
         * but it contains #closeCheckout.
         */
        const closeCheckout =
            document.getElementById("closeCheckout");

        if (closeCheckout) {
            let parent = closeCheckout;

            for (let i = 0; i < 6 && parent; i++) {
                if (
                    parent.style &&
                    parent.style.position === "fixed"
                ) {
                    parent.remove();
                    break;
                }

                parent = parent.parentElement;
            }
        }
    }

    function showHomeView() {

        closeOpenModals();
        exitAllGames();

        if (typeof renderGames === "function") {
            renderGames(games);
        }

        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });
    }

    function showGamesView() {

        closeOpenModals();
        enterAllGamesMode();

        if (typeof renderGames === "function") {
            renderGames(games);
        }

        const gamesSection =
            document.getElementById("gamesContainer");

        if (gamesSection) {
            gamesSection.scrollIntoView({
                behavior: "smooth",
                block: "start"
            });
        }
    }

    /*
     * Save original functions
     */
    const originalSelectGame =
        window.selectGame;

    const originalBuyPackage =
        window.buyPackage;

    const originalGoHome =
        window.goHome;

    const originalGoGames =
        window.goGames;


    const originalOpenWallet =
        window.openWallet;

    const originalOpenOrders =
        window.openOrders;

    const originalOpenSupport =
        window.openSupport;

    const originalOpenSafeSecure =
        window.openSafeSecure;


    /*
     * HOME
     */
    if (typeof originalGoHome === "function") {

        window.goHome = function (event) {

            if (event) {
                event.preventDefault();
            }

            pushPage("home");

            return originalGoHome.apply(
                this,
                arguments
            );
        };
    }


    /*
     * ALL GAMES
     */
    if (typeof originalGoGames === "function") {

        window.goGames = function (event) {

            if (event) {
                event.preventDefault();
            }

            pushPage("games");

            return originalGoGames.apply(
                this,
                arguments
            );
        };
    }


    /*
     * GAME → PACKAGES
     */
    if (typeof originalSelectGame === "function") {

        window.selectGame = async function (gameId) {

            pushPage(
                "game",
                {
                    gameId: gameId
                }
            );

            return originalSelectGame.apply(
                this,
                arguments
            );
        };
    }


    /*
     * PACKAGE → CHECKOUT
     */
    if (typeof originalBuyPackage === "function") {

        window.buyPackage = async function (
            packageId,
            amount,
            price,
            label
        ) {

            pushPage(
                "checkout",
                {
                    packageId: packageId,
                    amount: amount,
                    price: price,
                    label: label
                }
            );

            return originalBuyPackage.apply(
                this,
                arguments
            );
        };
    }


    /*
     * WALLET
     */
    if (typeof originalOpenWallet === "function") {

        window.openWallet = async function (event) {

            if (event) {
                event.preventDefault();
            }

            pushPage("wallet");

            return originalOpenWallet.apply(
                this,
                arguments
            );
        };
    }


    /*
     * ORDERS
     */
    if (typeof originalOpenOrders === "function") {

        window.openOrders = async function (event) {

            if (event) {
                event.preventDefault();
            }

            pushPage("orders");

            return originalOpenOrders.apply(
                this,
                arguments
            );
        };
    }


    /*
     * SUPPORT
     */
    if (typeof originalOpenSupport === "function") {

        window.openSupport = function (event) {

            if (event) {
                event.preventDefault();
            }

            pushPage("support");

            return originalOpenSupport.apply(
                this,
                arguments
            );
        };
    }


    /*
     * SAFE & SECURE
     */
    if (typeof originalOpenSafeSecure === "function") {

        window.openSafeSecure = function (event) {

            if (event) {
                event.preventDefault();
            }

            pushPage("safe");

            return originalOpenSafeSecure.apply(
                this,
                arguments
            );
        };
    }


    /*
     * Got it / X / bairer click diye modal bondho korle history entry ta o
     * soriye dao, jate pore back dile site theke ber na hoye jay
     */
    (function () {
        const MODALS = {
            safeSecureModal: "safe",
            supportModal: "support",
            walletModal: "wallet",
            apexOrdersOverlay: "orders"
        };
        const present = {};

        function check() {
            Object.keys(MODALS).forEach(function (id) {
                if (document.getElementById(id)) {
                    present[id] = true;
                    return;
                }
                if (!present[id]) return;
                present[id] = false;

                if (history.state && history.state.page === MODALS[id]) {
                    window.__apexSilentPop = true;
                    setTimeout(function () {
                        window.__apexSilentPop = false;
                    }, 600);
                    history.back();
                }
            });
        }

        new MutationObserver(check).observe(
            document.body,
            { childList: true, subtree: true }
        );
    })();


    /*
     * ANDROID / CHROME BACK + FORWARD
     */
    window.addEventListener(
        "popstate",
        function (event) {

            if (window.__apexSilentPop) {
                window.__apexSilentPop = false;
                return;
            }

            /* Profile open thakle back dile sudhu profile bondho hobe,
               Home/All Games view change hobe na */
            if (document.getElementById("apexProfileOverlay")) {
                return;
            }

            restoring = true;

            const state = event.state;

            try {

                /*
                 * HOME
                 */
                if (
                    !state ||
                    !state.apexGamer ||
                    state.page === "home"
                ) {
                    showHomeView();
                    return;
                }


                /*
                 * ALL GAMES
                 */
                if (state.page === "games") {
                    showGamesView();
                    return;
                }


                /*
                 * GAME / PACKAGES
                 */
                if (
                    state.page === "game" &&
                    state.gameId != null
                ) {

                    closeOpenModals();

                    if (
                        typeof originalSelectGame ===
                        "function"
                    ) {
                        originalSelectGame(
                            state.gameId
                        );
                    }

                    return;
                }


                /*
                 * CHECKOUT
                 */
                if (
                    state.page === "checkout" &&
                    state.packageId != null
                ) {

                    closeOpenModals();

                    if (
                        typeof originalBuyPackage ===
                        "function"
                    ) {
                        originalBuyPackage(
                            state.packageId,
                            state.amount,
                            state.price,
                            state.label
                        );
                    }

                    return;
                }


                /*
                 * WALLET
                 */
                if (state.page === "wallet") {

                    closeOpenModals();

                    if (
                        typeof originalOpenWallet ===
                        "function"
                    ) {
                        originalOpenWallet();
                    }

                    return;
                }


                /*
                 * ORDERS
                 */
                if (state.page === "orders") {

                    closeOpenModals();

                    if (
                        typeof originalOpenOrders ===
                        "function"
                    ) {
                        originalOpenOrders();
                    }

                    return;
                }


                /*
                 * SUPPORT
                 */
                if (state.page === "support") {

                    closeOpenModals();

                    if (
                        typeof originalOpenSupport ===
                        "function"
                    ) {
                        originalOpenSupport();
                    }

                    return;
                }


                /*
                 * SAFE & SECURE
                 */
                if (state.page === "safe") {

                    closeOpenModals();

                    if (
                        typeof originalOpenSafeSecure ===
                        "function"
                    ) {
                        originalOpenSafeSecure();
                    }

                    return;
                }

            } finally {

                setTimeout(
                    function () {
                        restoring = false;
                    },
                    0
                );
            }
        }
    );

})();



function togglePassword(inputId, button) {
    const input = document.getElementById(inputId);

    if (input.type === "password") {
        input.type = "text";
        button.textContent = "🙈";
        button.setAttribute("aria-label", "Hide password");
    } else {
        input.type = "password";
        button.textContent = "👁";
        button.setAttribute("aria-label", "Show password");
    }
}


function togglePassword(inputId, button) {
    const input = document.getElementById(inputId);

    if (!input) return;

    if (input.type === "password") {
        input.type = "text";
        button.textContent = "🥷";
    } else {
        input.type = "password";
        button.textContent = "👁️";
    }
}


/* ================= BUY GIFT CARD SCROLL ================= */

function goToGiftCards() {
    const section = document.getElementById("popular-products");

    if (section) {
        section.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });
    }
}


/* ================= RESULT POPUP ================= */

function showResultPopup(options) {

    const old = document.getElementById("resultPopupOverlay");
    if (old) old.remove();

    const isOk = options.type !== "error";
    const accent = isOk ? "#22c55e" : "#ef4444";

    if (!document.getElementById("resultPopupStyle")) {
        const style = document.createElement("style");
        style.id = "resultPopupStyle";
        style.textContent = `
            @keyframes rpFade { from {opacity:0} to {opacity:1} }
            @keyframes rpPop {
                from { opacity:0; transform: translateY(18px) scale(.94) }
                to   { opacity:1; transform: none }
            }
            @keyframes rpRing {
                0%   { box-shadow: 0 0 0 0 var(--rp-glow) }
                100% { box-shadow: 0 0 0 16px transparent }
            }
        `;
        document.head.appendChild(style);
    }

    const overlay = document.createElement("div");
    overlay.id = "resultPopupOverlay";
    Object.assign(overlay.style, {
        position: "fixed",
        inset: "0",
        background: "rgba(2, 6, 23, 0.72)",
        backdropFilter: "blur(5px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
        zIndex: "2147483000",
        animation: "rpFade .2s ease",
    });

    const card = document.createElement("div");
    Object.assign(card.style, {
        width: "100%",
        maxWidth: "380px",
        background: "linear-gradient(160deg, #111c36, #0b1226)",
        border: "1px solid rgba(148, 163, 184, 0.18)",
        borderRadius: "22px",
        padding: "28px 22px 22px",
        textAlign: "center",
        color: "#f1f5f9",
        boxShadow: "0 24px 60px rgba(0, 0, 0, 0.55)",
        animation: "rpPop .28s cubic-bezier(.2,.9,.3,1.2)",
        fontFamily: "inherit",
    });

    const icon = document.createElement("div");
    icon.style.setProperty("--rp-glow", accent + "66");
    Object.assign(icon.style, {
        width: "64px",
        height: "64px",
        margin: "0 auto 16px",
        borderRadius: "50%",
        background: accent + "22",
        border: "2px solid " + accent,
        color: accent,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "32px",
        fontWeight: "700",
        animation: "rpRing 1.4s ease-out 2",
    });
    icon.textContent = isOk ? "✓" : "✕";

    const title = document.createElement("div");
    title.textContent = options.title || "";
    Object.assign(title.style, {
        fontSize: "20px",
        fontWeight: "700",
        marginBottom: "6px",
    });

    const message = document.createElement("div");
    message.textContent = options.message || "";
    Object.assign(message.style, {
        fontSize: "13.5px",
        lineHeight: "1.5",
        color: "#94a3b8",
        marginBottom: "18px",
    });

    card.appendChild(icon);
    card.appendChild(title);
    card.appendChild(message);

    const rows = options.rows || [];
    const status = options.status;

    if (rows.length || status) {
        const box = document.createElement("div");
        Object.assign(box.style, {
            background: "rgba(15, 23, 42, 0.75)",
            border: "1px solid rgba(148, 163, 184, 0.14)",
            borderRadius: "14px",
            padding: "4px 14px",
            marginBottom: "18px",
            textAlign: "left",
        });

        const addRow = (label, valueNode, last) => {
            const row = document.createElement("div");
            Object.assign(row.style, {
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "14px",
                padding: "11px 0",
                borderBottom: last
                    ? "none"
                    : "1px solid rgba(148, 163, 184, 0.12)",
                fontSize: "13.5px",
            });

            const l = document.createElement("span");
            l.textContent = label;
            l.style.color = "#94a3b8";

            row.appendChild(l);
            row.appendChild(valueNode);
            box.appendChild(row);
        };

        rows.forEach((item, i) => {
            const v = document.createElement("span");
            v.textContent = item[1];
            Object.assign(v.style, {
                fontWeight: "600",
                textAlign: "right",
                wordBreak: "break-all",
            });
            addRow(item[0], v, i === rows.length - 1 && !status);
        });

        if (status) {
            const badge = document.createElement("span");
            badge.textContent =
                String(status).charAt(0).toUpperCase() +
                String(status).slice(1);
            Object.assign(badge.style, {
                background: "rgba(245, 158, 11, 0.16)",
                color: "#fbbf24",
                border: "1px solid rgba(245, 158, 11, 0.4)",
                borderRadius: "999px",
                padding: "3px 12px",
                fontSize: "12px",
                fontWeight: "700",
            });
            addRow("Status", badge, true);
        }

        card.appendChild(box);
    }

    const button = document.createElement("button");
    button.type = "button";
    button.textContent = "OK";
    Object.assign(button.style, {
        width: "100%",
        border: "none",
        borderRadius: "12px",
        padding: "13px",
        fontSize: "15px",
        fontWeight: "700",
        color: "#fff",
        cursor: "pointer",
        background: isOk
            ? "linear-gradient(135deg, #2563eb, #1d4ed8)"
            : "linear-gradient(135deg, #ef4444, #dc2626)",
    });

    const close = () => {
        document.removeEventListener("keydown", onKey);
        overlay.remove();
    };
    const onKey = (e) => {
        if (e.key === "Escape") close();
    };

    button.addEventListener("click", close);
    overlay.addEventListener("click", (e) => {
        if (e.target === overlay) close();
    });
    document.addEventListener("keydown", onKey);

    card.appendChild(button);
    overlay.appendChild(card);
    document.body.appendChild(overlay);
}


/* ================= PROFILE ================= */

function apexEscape(value) {
    const d = document.createElement("div");
    d.textContent = value == null ? "" : String(value);
    return d.innerHTML;
}

async function openProfile(event) {
    if (!document.getElementById("apexProfileStyle")) {
        const st = document.createElement("style");
        st.id = "apexProfileStyle";
        st.textContent = `
#apexProfileOverlay { position:fixed; inset:0; background:rgba(0,0,0,.75); z-index:99999; padding:12px; overflow:auto; display:flex; flex-direction:column; }
@media (max-width: 768px) { #apexProfileOverlay { bottom:55px; } }
@media (min-width: 769px) { #apexProfileOverlay { bottom:69px; } }
#apexProfileOverlay .apx-box { width:100%; flex:1 0 auto; display:flex; flex-direction:column; max-width:340px; margin:16px auto; background:#0d1230; border-radius:16px; padding:12px; color:#fff; }
#apexProfileOverlay .apx-top { display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; }
#apexProfileOverlay .apx-top h2 { margin:0; font-size:15px !important; line-height:1.2 !important; }
#apexProfileClose { background:#ff5252; color:#fff; border:0; border-radius:7px; padding:4px 9px; font-size:12px; cursor:pointer; }
#apexProfileOverlay .apx-user { background:#141a44; border:1px solid #232b5e; border-radius:16px; padding:12px; margin-bottom:9px; }
#apexProfileOverlay .apx-user-row { display:flex; align-items:center; gap:10px; margin-bottom:10px; }
#apexProfileOverlay .apx-avatar { width:44px; height:44px; border-radius:50%; background:#4a6572; display:flex; align-items:center; justify-content:center; font-size:19px; font-weight:600; flex:none; }
#apexProfileOverlay .apx-name { font-size:15px; font-weight:700; line-height:1.2; word-break:break-word; }
#apexProfileOverlay .apx-email { color:#9aa4bf; font-size:11.5px; word-break:break-all; margin-top:2px; }
#apexProfileOverlay details.apx-details { background:#1f2548; border-radius:12px; overflow:hidden; }
#apexProfileOverlay .apx-details summary { list-style:none; display:flex; justify-content:space-between; align-items:center; padding:10px 12px; font-weight:700; font-size:13.5px; cursor:pointer; }
#apexProfileOverlay .apx-details summary::-webkit-details-marker { display:none; }
#apexProfileOverlay .apx-chev { width:16px; height:16px; color:#aab2d0; transition:transform .2s; }
#apexProfileOverlay .apx-details[open] .apx-chev { transform:rotate(180deg); }
#apexProfileOverlay .apx-detail-row { display:flex; justify-content:space-between; gap:10px; padding:9px 12px 11px; color:#9aa4bf; font-size:12.5px; border-top:1px solid #2b3370; }
#apexProfileOverlay .apx-detail-row b { color:#fff; }
#apexProfileOverlay .apx-stats { display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-bottom:9px; }
#apexProfileOverlay .apx-stat { background:#141a44; border:1px solid #232b5e; border-radius:15px; padding:11px; min-width:0; }
#apexProfileOverlay .apx-stat small { display:block; color:#9aa4bf; font-size:11.5px; margin-bottom:4px; }
#apexProfileOverlay .apx-val { font-size:14px; font-weight:800; overflow-wrap:anywhere; }
#apexProfileOverlay .apx-val.apx-orange { color:#ff8a00; }
#apexProfileOverlay .apx-link { display:inline-block; margin-top:7px; color:#ff8a00; font-weight:700; font-size:11px; background:none; border:0; padding:0; cursor:pointer; }
#apexProfileOverlay .apx-menu { background:#141a44; border:1px solid #232b5e; border-radius:15px; overflow:hidden; margin-bottom:9px; }
#apexProfileOverlay .apx-item { width:100%; display:flex; align-items:center; gap:11px; padding:12px 13px; background:none; border:0; border-bottom:1px solid #232b5e; color:#fff; font-size:13px; font-weight:700; cursor:pointer; text-align:left; }
#apexProfileOverlay .apx-item:last-child { border-bottom:0; }
#apexProfileOverlay .apx-item svg { width:19px; height:19px; flex:none; color:#aab2d0; }
#apexProfileOverlay .apx-item span { flex:1; }
#apexProfileOverlay .apx-item svg.apx-arrow { width:15px; height:15px; }
#apexProfileLogout { width:100%; display:flex; align-items:center; gap:11px; padding:12px 13px; background:#141a44; border:1px solid #232b5e; border-radius:15px; color:#ff4d5e; font-size:14px; font-weight:700; cursor:pointer; }
#apexProfileLogout svg { width:19px; height:19px; flex:none; }
#apexProfileOverlay .apx-box > * { flex-shrink:0; }
#apexProfileOverlay .apx-foot { flex:1 0 auto; margin-top:9px; box-sizing:border-box; background:#141a44; border:1px solid #232b5e; border-radius:15px; padding:18px 16px 20px; }
#apexProfileOverlay .apx-foot-in { padding:0; }
#apexProfileOverlay .apx-foot-logo { font-size:16px; font-weight:800; letter-spacing:.5px; line-height:1; }
#apexProfileOverlay .apx-foot-logo b { color:#3b82e6; }
#apexProfileOverlay .apx-foot-logo span { color:#ff8a00; font-weight:300; }
#apexProfileOverlay .apx-foot-text { color:#9aa4bf; font-size:12.5px; line-height:1.7; margin:14px 0 16px; }
#apexProfileOverlay .apx-foot-icons { display:flex; gap:10px; padding-bottom:16px; border-bottom:1px solid #2b3370; }
#apexProfileOverlay .apx-foot-icons a { width:40px; height:40px; border-radius:12px; display:flex; align-items:center; justify-content:center; text-decoration:none; background:#1f2548; border:1px solid #2b3370; box-sizing:border-box; }
#apexProfileOverlay .apx-foot-icons a svg { width:20px; height:20px; }
#apexProfileOverlay .apx-foot h4 { margin:16px 0 8px; font-size:13px; letter-spacing:1.5px; color:#fff; font-weight:800; }
#apexProfileOverlay .apx-foot-links a { display:block; color:#9aa4bf; font-size:14.5px; text-decoration:none; padding:4px 0; }
/* apx-desktop-fix */
@media (min-width: 769px) {
#apexProfileOverlay { align-items:stretch; padding:12px; }
#apexProfileOverlay .apx-box { flex:0 0 auto; width:380px; max-width:calc(100% - 24px); margin:24px auto auto; padding:16px; border:1px solid rgba(255,255,255,.08); box-shadow:0 20px 60px rgba(0,0,0,.5); }
#apexProfileOverlay .apx-foot { flex:0 0 auto; }
}`;
        document.head.appendChild(st);
    }
    if (event) event.preventDefault();

    const token = localStorage.getItem("access_token");

    if (!token) {
        if (typeof closeLoginRequired === "function") closeLoginRequired();
        openLogin();
        return;
    }

    const headers = { "Authorization": `Bearer ${token}` };

    try {
        const [meRes, walletRes, ordersRes] = await Promise.all([
            fetch(`${API}/users/me`, { headers }),
            fetch(`${API}/wallet`, { headers }),
            fetch(`${API}/orders`, { headers }),
        ]);

        if (meRes.status === 401) {
            localStorage.removeItem("access_token");
            showLoginExpiredPopup();
            return;
        }

        const me = await meRes.json();

        if (!meRes.ok) {
            throw new Error(me.detail || "Profile load করা যায়নি");
        }

        const wallet = walletRes.ok ? await walletRes.json() : {};
        const orders = ordersRes.ok ? await ordersRes.json() : [];

        const balance = Number(wallet.wallet_balance || 0);
        const orderCount = Array.isArray(orders) ? orders.length : 0;
        const initial = apexEscape((me.name || "?").trim().charAt(0).toUpperCase());

        const ico = (inner, cls) => `<svg class="${cls || ""}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${inner}</svg>`;
        const arrow = ico('<path d="M9 6l6 6-6 6"/>', "apx-arrow");

        const overlay = document.createElement("div");
        overlay.id = "apexProfileOverlay";

        overlay.innerHTML = `
            <div class="apx-box">

                <div class="apx-top">
                    <h2>My Profile</h2>
                    <button id="apexProfileClose">✕</button>
                </div>

                <div class="apx-user">
                    <div class="apx-user-row">
                        <div class="apx-avatar">${initial}</div>
                        <div>
                            <div class="apx-name">${apexEscape(me.name)}</div>
                            <div class="apx-email">${apexEscape(me.email)}</div>
                        </div>
                    </div>
                    <details class="apx-details">
                        <summary>Account Details ${ico('<path d="M6 9l6 6 6-6"/>', "apx-chev")}</summary>
                        <div class="apx-detail-row"><span>User ID</span><b>#${apexEscape(me.id)}</b></div>
                    </details>
                </div>

                <div class="apx-stats">
                    <div class="apx-stat">
                        <small>Wallet Balance</small>
                        <div class="apx-val apx-orange">৳${balance}</div>
                        <button class="apx-link" id="apexProfileAddMoney">+ Add Money →</button>
                    </div>
                    <div class="apx-stat">
                        <small>Total Orders</small>
                        <div class="apx-val">${orderCount}</div>
                        <button class="apx-link" id="apexProfileViewOrders">View Orders →</button>
                    </div>
                </div>

                <div class="apx-menu">
                    <button class="apx-item" id="apexProfileMenuOrders">
                        ${ico('<rect x="5" y="4" width="14" height="17" rx="2.5"/><path d="M9 4v-.5A1.5 1.5 0 0 1 10.5 2h3A1.5 1.5 0 0 1 15 3.5V4"/><path d="M8.5 10h7M8.5 13.5h7M8.5 17h4"/>')}
                        <span>My Orders</span>${arrow}
                    </button>
                    <button class="apx-item" id="apexProfileMenuWallet">
                        ${ico('<rect x="3" y="6" width="18" height="13" rx="3"/><path d="M3 10.5h18"/>')}
                        <span>Add Money</span>${arrow}
                    </button>
                </div>

                <button id="apexProfileLogout">
                    ${ico('<path d="M10 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h4"/><path d="M15 8l4 4-4 4M19 12H9"/>')}
                    Logout
                </button>
            <div class="apx-foot">
                <div class="apx-foot-in">
                    <div class="apx-foot-logo">🎮 <b>APEX</b><span>GAMER</span></div>
                    <p class="apx-foot-text">ApexGamer Best Online Games Shop in Bangladesh. Provide the Cheapest Mobile Games Top Up, Free Fire Top Up, Game Cards, Gift Card, and More</p>
                    <div class="apx-foot-icons">
                        <a class="tg" href="https://wa.me/8800000000000" target="_blank" rel="noopener noreferrer" aria-label="WhatsApp"><svg viewBox="0 0 24 24"><path fill="#25D366" d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg></a>
                        <a class="ph" href="tel:+8800000000000" aria-label="Call"><svg viewBox="0 0 24 24" fill="none" stroke="#ff8a00" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"/></svg></a>
                    </div>
                    <h4>QUICK LINKS</h4>
                    <div class="apx-foot-links"><a href="#">Blog</a></div>
                </div>
            </div>
            </div>`;

        /* ---- Back button support: profile gets its own history entry ---- */
        const prevState = history.state;
        let pushed = true;
        history.pushState({ apexGamer: true, page: "profile" }, "", location.href);

        let navLinks = [];
        const cleanup = () => {
            document.removeEventListener("keydown", onKey);
            window.removeEventListener("popstate", onPop, true);
            navLinks.forEach(a => a.removeEventListener("click", closeQuick));
            overlay.remove();
        };

        // Phone back button / gesture: just close the profile, stay on the site
        const onPop = (e) => {
            if (!pushed) return;
            e.stopImmediatePropagation();
            pushed = false;
            cleanup();
        };
        window.addEventListener("popstate", onPop, true);

        // Close with X / outside click / Esc: remove the history entry via back()
        const close = (after) => {
            const cb = typeof after === "function" ? after : null;
            if (pushed) {
                pushed = false;
                cleanup();
                let done = false;
                const finish = () => {
                    if (done) return;
                    done = true;
                    window.removeEventListener("popstate", finish);
                    if (cb) setTimeout(cb, 0);
                };
                window.addEventListener("popstate", finish);
                setTimeout(finish, 400);
                window.__apexSilentPop = true;
                setTimeout(function () { window.__apexSilentPop = false; }, 600);
                history.back();
            } else {
                cleanup();
                if (cb) cb();
            }
        };

        // Close without history.back() (used when another page opens right away)
        function closeQuick() {
            if (pushed) {
                pushed = false;
                try { history.replaceState(prevState, "", location.href); } catch (e) {}
            }
            cleanup();
        }

        const onKey = (e) => { if (e.key === "Escape") close(); };

        overlay.addEventListener("click", (e) => {
            if (e.target === overlay) close();
        });
        document.addEventListener("keydown", onKey);

        document.body.appendChild(overlay);

        navLinks = Array.from(document.querySelectorAll(".mobile-nav a"));
        navLinks.forEach(a => a.addEventListener("click", closeQuick));

        document.getElementById("apexProfileClose")
            .addEventListener("click", () => close());

        const goWallet = (e) => {
            close(() => { if (typeof openWallet === "function") openWallet(e); });
        };
        const goOrders = (e) => {
            close(() => { if (typeof openOrders === "function") openOrders(e); });
        };
        document.getElementById("apexProfileAddMoney").addEventListener("click", goWallet);
        document.getElementById("apexProfileMenuWallet").addEventListener("click", goWallet);
        document.getElementById("apexProfileViewOrders").addEventListener("click", goOrders);
        document.getElementById("apexProfileMenuOrders").addEventListener("click", goOrders);

        document.getElementById("apexProfileLogout")
            .addEventListener("click", () => {
                localStorage.removeItem("access_token");
                closeQuick();
                window.location.reload();
            });

    } catch (error) {
        alert(error.message || "Profile load করা যায়নি");
    }
}


/* ===== MOBILE: Shop Now / Buy Now ===== */
(function () {
    const isMobile = () => window.matchMedia("(max-width: 768px)").matches;

    // Shop Now -> opens search bar
    const shopBtn = document.querySelector(".shop-btn");
    if (shopBtn) {
        shopBtn.addEventListener("click", function (e) {
            if (!isMobile()) return;
            e.preventDefault();
            const input = document.getElementById("searchInput");
            if (!input) return;
            input.focus({ preventScroll: true });
            window.scrollTo({ top: 0, behavior: "smooth" });
        });
    }

    // Buy Now -> goes to games page
    const buyBtn = document.querySelector(".promo-text button");
    if (buyBtn) {
        buyBtn.addEventListener("click", function (e) {
            if (!isMobile()) return;
            e.preventDefault();
            if (typeof showAllGames === "function") {
                showAllGames(e);
            }
        });
    }
})();


/* ===== DESKTOP: cart icon -> focus search bar ===== */
(function () {
    const isDesktop = () => window.matchMedia("(min-width: 769px)").matches;

    const cartBtn = Array.from(
        document.querySelectorAll(".header-actions .icon-button")
    ).find(btn => btn.textContent.includes("🔍"));

    if (!cartBtn) return;
    cartBtn.title = "Search";
    cartBtn.setAttribute("aria-label", "Search");

    cartBtn.addEventListener("click", function (e) {
        if (!isDesktop()) return;
        e.preventDefault();
        const input = document.getElementById("searchInput");
        if (!input) return;
        input.focus({ preventScroll: true });
        window.scrollTo({ top: 0, behavior: "smooth" });
    });
})();


/* ===== KEEP LOGGED IN: Login button opens Profile if already logged in ===== */
document.addEventListener("click", function (e) {
    const btn = e.target.closest && e.target.closest(".login-btn, .nav-login");
    if (!btn) return;
    if (!localStorage.getItem("access_token")) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    if (typeof openProfile === "function") openProfile(e);
}, true);


/* ===== ALL GAMES PAGE (View All) ===== */
(function () {
    var css = document.createElement("style");
    css.textContent =
        "body.all-games-mode .hero, body.all-games-mode .quick-actions, " +
        "body.all-games-mode .promo-banner, body.all-games-mode .benefits, " +
        "body.all-games-mode #popular-products, body.all-games-mode #viewAllGamesBtn " +
        "{ display:none !important; }" +
        "#allGamesBar { display:none; }" +
        "body.all-games-mode #allGamesBar { display:flex; align-items:center; gap:10px; padding:2px 0 10px; }" +
        "#allGamesBar button { border:0; background:#eef3ff; color:#1468ff; font-weight:800; font-size:14px; padding:6px 12px; border-radius:10px; cursor:pointer; }" +
        "#allGamesBar span { font-size:16px; font-weight:800; }";
    document.head.appendChild(css);
})();

function ensureAllGamesBar() {
    if (document.getElementById("allGamesBar")) return;
    var box = document.getElementById("gamesContainer");
    if (!box) return;
    var bar = document.createElement("div");
    bar.id = "allGamesBar";
    bar.innerHTML = '<button type="button" onclick="exitAllGames(true)">\u2190 Back</button><span>All Games</span>';
    box.parentNode.insertBefore(bar, box);
}

function exitAllGames(scrollTop) {
    showingAllGames = false;
    document.body.classList.remove("all-games-mode");
    if (typeof renderGames === "function") {
        renderGames(games);
    }
    if (scrollTop) {
        window.scrollTo({ top: 0, behavior: "smooth" });
    }
}

function enterAllGamesMode() {
    showingAllGames = true;
    document.body.classList.add("all-games-mode");
    ensureAllGamesBar();
}


/* ===== LOGGED-IN: show profile icon instead of Login button ===== */
(function () {
    function syncAuthUI() {
        if (!document.body) return;
        document.body.classList.toggle(
            "logged-in",
            !!localStorage.getItem("access_token")
        );
    }

    var origSet = Storage.prototype.setItem;
    var origRemove = Storage.prototype.removeItem;

    Storage.prototype.setItem = function (key) {
        origSet.apply(this, arguments);
        if (key === "access_token") syncAuthUI();
    };

    Storage.prototype.removeItem = function (key) {
        origRemove.apply(this, arguments);
        if (key === "access_token") syncAuthUI();
    };

    syncAuthUI();
    document.addEventListener("DOMContentLoaded", syncAuthUI);
})();


/* ===== FORGOT PASSWORD ===== */
(function () {
    var box = document.querySelector(".login-box");
    var modal = document.getElementById("loginModal");
    var forgotForm = document.getElementById("forgotForm");
    var forgotLink = document.getElementById("forgotLink");
    var forgotBack = document.getElementById("forgotBack");
    var forgotEmail = document.getElementById("forgotEmail");

    if (!box || !forgotForm || !forgotLink || !forgotBack || !forgotEmail) return;

    function googleWrap() {
        var g = document.getElementById("googleSignInBtn");
        return g ? g.parentElement : null;
    }

    function enterForgot() {
        box.classList.add("forgot-mode");
        forgotForm.style.display = "flex";

        var w = googleWrap();
        if (w) w.style.display = "none";

        document.getElementById("authTitle").textContent = "Forgot password?";
        document.getElementById("authSubtitle").textContent =
            "Enter your email and we will send you a reset link";
        document.getElementById("loginMessage").textContent = "";

        var loginEmail = document.getElementById("loginEmail");
        if (loginEmail && loginEmail.value && !forgotEmail.value) {
            forgotEmail.value = loginEmail.value;
        }

        forgotEmail.focus();
    }

    function exitForgot() {
        if (!box.classList.contains("forgot-mode")) return;

        box.classList.remove("forgot-mode");
        forgotForm.style.display = "none";

        var w = googleWrap();
        if (w) w.style.display = "";

        if (typeof updateAuthForm === "function") updateAuthForm();
    }

    forgotLink.addEventListener("click", function (e) {
        e.preventDefault();
        enterForgot();
    });

    forgotBack.addEventListener("click", function (e) {
        e.preventDefault();
        exitForgot();
    });

    forgotForm.addEventListener("submit", async function (e) {
        e.preventDefault();

        var msg = document.getElementById("loginMessage");
        var btn = forgotForm.querySelector("button[type=submit]");
        var email = forgotEmail.value.trim();

        if (!email) return;

        msg.textContent = "Sending...";
        btn.disabled = true;

        try {
            var res = await fetch("/auth/forgot-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: email })
            });

            var data = {};
            try { data = await res.json(); } catch (err) {}

            if (res.ok) {
                msg.textContent = data.message ||
                    "If an account exists for this email, a reset link has been sent.";
            } else if (res.status === 422) {
                msg.textContent = "Please enter a valid email address.";
            } else {
                msg.textContent = "Something went wrong. Please try again.";
            }
        } catch (err) {
            msg.textContent = "Could not reach the server. Please try again.";
        }

        btn.disabled = false;
    });

    if (modal && window.MutationObserver) {
        new MutationObserver(function () {
            if (modal.style.display === "none") exitForgot();
        }).observe(modal, { attributes: true, attributeFilter: ["style"] });
    }
})();


/* ===== BACK BUTTON / SWIPE-BACK CLOSES LOGIN POPUP ===== */
(function () {
    var modal = document.getElementById("loginModal");
    if (!modal) return;

    var pushed = false;

    function isOpen() {
        return window.getComputedStyle(modal).display !== "none";
    }

    function sync() {
        var open = isOpen();

        if (open && !pushed) {
            history.pushState({ apexGamer: true, page: "loginModal" }, "", location.href);
            pushed = true;
        } else if (!open && pushed) {
            pushed = false;
            window.__apexSilentPop = true;
            setTimeout(function () { window.__apexSilentPop = false; }, 600);
            history.back();
        }
    }

    new MutationObserver(sync).observe(modal, {
        attributes: true,
        attributeFilter: ["style", "class"]
    });

    window.addEventListener("popstate", function (event) {
        // Back pressed while login popup is open -> only close the popup
        if (pushed) {
            pushed = false;
            event.stopImmediatePropagation();
            if (typeof closeLogin === "function") {
                closeLogin();
            } else {
                modal.style.display = "none";
            }
            return;
        }

        // Forward pressed onto the popup's history entry -> step back quietly
        var s = event.state;
        if (s && s.page === "loginModal") {
            event.stopImmediatePropagation();
            window.__apexSilentPop = true;
            setTimeout(function () { window.__apexSilentPop = false; }, 600);
            history.back();
        }
    }, true);
})();


/* ================= HOW TO PLACE ORDER POPUP ================= */

function apexShowHowTo() {

    if (document.getElementById("apexHowToModal")) {
        return;
    }

    const box = document.createElement("div");
    box.id = "apexHowToModal";
    box.style.cssText =
        "position:fixed;inset:0;background:rgba(0,0,0,.75);z-index:100000;" +
        "display:flex;align-items:center;justify-content:center;padding:20px;";

    box.innerHTML = `
        <div style="
            background:#11172b;
            color:white;
            border-radius:16px;
            padding:20px;
            max-width:420px;
            width:100%;
            font-size:15px;
            line-height:1.6;
            box-shadow:0 20px 60px rgba(0,0,0,.5);
        ">
            <h3 style="margin:0 0 12px;font-size:18px;">How to place an order?</h3>
            <ol style="padding-left:20px;margin:0 0 18px;">
                <li>Game ও প্যাকেজ বেছে নিন</li>
                <li>আপনার Player ID সঠিকভাবে লিখুন</li>
                <li>Quantity ঠিক করুন</li>
                <li>Go to Payment চাপুন</li>
                <li>Payment method বেছে নিয়ে Confirm Payment করুন</li>
            </ol>
            <button id="apexHowToClose" style="
                width:100%;
                padding:12px;
                border:0;
                border-radius:10px;
                background:#ff8a00;
                color:white;
                font-weight:700;
                font-size:15px;
                cursor:pointer;
            ">বন্ধ করুন</button>
        </div>
    `;

    box.addEventListener("click", function (e) {
        if (e.target === box || e.target.id === "apexHowToClose") {
            box.remove();
        }
    });

    document.body.appendChild(box);
}
