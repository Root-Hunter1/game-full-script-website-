const API_BASE = "";

const token = localStorage.getItem("admin_token");

if (!token) {
    window.location.replace("/admin-login.html");
}

function authHeaders() {
    return {
        "Authorization": `Bearer ${token}`
    };
}


function showMessage(message, type = "error") {
    const box = document.getElementById("adminMessage");

    box.textContent = message;
    box.style.display = "block";

    if (type === "success") {
        box.style.background = "#123d2a";
        box.style.color = "#5ee6a8";
    } else {
        box.style.background = "#451b1b";
        box.style.color = "#ff7777";
    }
}


function logout() {
    localStorage.removeItem("admin_token");
    window.location.replace("/admin-login.html");
}


function statusClass(status) {
    if (!status) return "status";

    return `status status-${String(status).toLowerCase()}`;
}


function formatDate(date) {
    if (!date) return "-";

    try {
        return new Date(date).toLocaleString();
    } catch {
        return date;
    }
}


async function loadOrders() {

    const container = document.getElementById("ordersContainer");
    container.innerHTML = "Loading orders...";

    try {
        const response = await fetch(
            `${API_BASE}/admin/orders`,
            {
                method: "GET",
                headers: authHeaders()
            }
        );

        if (response.status === 401) {
            logout();
            return;
        }

        if (response.status === 403) {
            showMessage("Admin access required.");
            container.innerHTML = "";
            return;
        }

        if (!response.ok) {
            throw new Error("Failed to load orders");
        }

        const orders = await response.json();

        updateOrderStats(orders);

        const originalOrders = orders.filter(o =>
            o.status === "pending" || o.status === "paid"
        );

        const processingOrders = orders.filter(o =>
            o.status === "processing"
        );

        const completedOrders = orders.filter(o =>
            o.status === "completed"
        );

        const failedOrders = orders.filter(o =>
            o.status === "failed" || o.status === "delivery_failed"
        );

        function renderOrder(order) {
            return `
                <tr>
                    <td>#${order.id}</td>
                    <td>${escapeHtml(order.game_name || "-")}</td>
                    <td>${escapeHtml(order.player_id || "-")}</td>
                    <td>${escapeHtml(order.package_label ?? order.package_amount ?? "-")}</td>
                    <td><strong>× ${order.quantity ?? 1}</strong></td>
                    <td>৳${order.price ?? 0}</td>
                    <td>${escapeHtml(order.payment_method || "-")}</td>
                    <td>${escapeHtml(order.transaction_id || "-")}</td>
                    <td>${escapeHtml(order.supplier_name || "-")}</td>
                    <td>${escapeHtml(order.supplier_order_id || "-")}</td>
                    <td>
                        <span class="${statusClass(order.supplier_status)}">
                            ${escapeHtml(order.supplier_status || "-")}
                        </span>
                    </td>
                    <td>
                        <span class="${statusClass(order.status)}">
                            ${escapeHtml(order.status || "-")}
                        </span>
                    </td>
                    <td>${formatDate(order.created_at)}</td>
                    <td class="order-actions">
                        ${
                            order.status === "paid"
                            ? `
                                <button
                                    class="approve-btn"
                                    onclick="updateOrderStatus(${order.id}, 'processing')">
                                    Approve &amp; Send
                                </button>

                                <button
                                    class="approve-btn failed-btn"
                                    onclick="updateOrderStatus(${order.id}, 'failed')">
                                    Cancel
                                </button>
                            `
                            : order.status === "processing"
                            ? `
                                <button
                                    class="approve-btn complete-btn"
                                    onclick="updateOrderStatus(${order.id}, 'completed')">
                                    Complete
                                </button>
                            `
                            : ""
                        }
                    </td>
                </tr>
            `;
        }

        function section(title, icon, list, cls) {
            return `
                <div class="order-group ${cls}">
                    <div class="order-group-title">
                        <strong>${icon} ${title}</strong>
                        <span class="order-count">${list.length}</span>
                    </div>

                    ${
                        list.length
                        ? `
                        <div class="order-table-wrap">
                            <table>
                                <thead>
                                    <tr>
                                        <th>ID</th>
                                        <th>Game</th>
                                        <th>Player ID</th>
                                        <th>Package</th>
                                        <th>Quantity</th>
                                        <th>Total Price</th>
                                        <th>Payment</th>
                                        <th>Transaction ID</th>
                                        <th>Supplier</th>
                                        <th>Supplier Order</th>
                                        <th>Supplier Status</th>
                                        <th>Order Status</th>
                                        <th>Date</th>
                                        <th>Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${list.map(renderOrder).join("")}
                                </tbody>
                            </table>
                        </div>
                        `
                        : `<div class="order-empty">No orders here.</div>`
                    }
                </div>
            `;
        }

        container.innerHTML =
            section("Original Orders", "🆕", originalOrders, "original-orders") +
            section("Processing Orders", "⚙️", processingOrders, "processing-orders") +
            section("Completed Orders", "✅", completedOrders, "completed-orders") +
            section("Failed Orders", "❌", failedOrders, "failed-orders");

    } catch (error) {
        console.error(error);

        container.innerHTML =
            `<div class="empty">Failed to load orders.</div>`;

        showMessage(error.message);
    }
}



function updateOrderStats(orders) {
    document.getElementById("totalOrders").textContent =
        orders.length;

    document.getElementById("pendingOrders").textContent =
        orders.filter(order => order.status === "pending").length;

    document.getElementById("paidOrders").textContent =
        orders.filter(order => order.status === "paid").length;

    document.getElementById("processingOrders").textContent =
        orders.filter(order => order.status === "processing").length;
}

async function loadDeposits() {

    const container =
        document.getElementById("depositsContainer");

    container.innerHTML = "Loading deposits...";

    try {

        const response = await fetch(
            `${API_BASE}/admin/deposits`,
            {
                method: "GET",
                headers: authHeaders()
            }
        );

        if (response.status === 401) {
            logout();
            return;
        }

        if (response.status === 403) {
            showMessage("Admin access required.");
            container.innerHTML = "";
            return;
        }

        if (!response.ok) {
            throw new Error("Failed to load deposits");
        }

        const deposits = await response.json();

        updateDepositStats(deposits);

        if (!deposits.length) {
            container.innerHTML =
                `<div class="empty">
                    No deposits found.
                </div>`;
            return;
        }

        let html = `
            <table>
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>User ID</th>
                        <th>Amount</th>
                        <th>Payment Method</th>
                        <th>Transaction ID</th>
                        <th>Status</th>
                        <th>Date</th>
                        <th>Action</th>
                    </tr>
                </thead>

                <tbody>
        `;

        deposits.forEach(deposit => {

            const pending =
                deposit.status === "pending";

            html += `
                <tr>

                    <td>#${deposit.id}</td>

                    <td>
                        ${deposit.user_id}
                    </td>

                    <td>
                        ৳${deposit.amount}
                    </td>

                    <td>
                        ${escapeHtml(
                            deposit.payment_method || "-"
                        )}
                    </td>

                    <td>
                        ${escapeHtml(
                            deposit.transaction_id || "-"
                        )}
                    </td>

                    <td>
                        <span class="${statusClass(
                            deposit.status
                        )}">
                            ${escapeHtml(
                                deposit.status || "-"
                            )}
                        </span>
                    </td>

                    <td>
                        ${formatDate(
                            deposit.created_at
                        )}
                    </td>

                    <td>

                        ${
                            pending
                                ? `
                                    <button
                                        class="approve-btn"
                                        onclick="approveDeposit(
                                            ${deposit.id}
                                        )"
                                    >
                                        Approve
                                    </button>
                                  `
                                : "—"
                        }

                    </td>

                </tr>
            `;
        });

        html += `
                </tbody>
            </table>
        `;

        container.innerHTML = html;

    } catch (error) {

        console.error(error);

        container.innerHTML =
            `<div class="empty">
                Failed to load deposits.
            </div>`;

        showMessage(error.message);
    }
}


function updateDepositStats(deposits) {

    const pending =
        deposits.filter(
            deposit => deposit.status === "pending"
        ).length;

    document.getElementById("pendingDeposits")
        .textContent = pending;
}


async function approveDeposit(depositId) {

    const confirmed = confirm(
        `Approve deposit #${depositId}?`
    );

    if (!confirmed) {
        return;
    }

    try {

        const response = await fetch(
            `${API_BASE}/admin/deposits/${depositId}/status?status=approved`,
            {
                method: "POST",
                headers: authHeaders()
            }
        );

        if (response.status === 401) {
            logout();
            return;
        }

        if (response.status === 403) {
            showMessage("Admin access required.");
            return;
        }

        const data = await response.json();

        if (!response.ok) {
            throw new Error(
                data.detail || "Approval failed"
            );
        }

        showMessage(
            `Deposit #${depositId} approved successfully.`,
            "success"
        );

        await loadDeposits();

    } catch (error) {

        console.error(error);

        showMessage(error.message);
    }
}


function escapeHtml(value) {

    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}


loadOrders();
loadDeposits();
loadPaymentAccounts();

async function updateOrderStatus(orderId, status) {

    const confirmed = confirm(
        `Update order #${orderId} to ${status}?`
    );

    if (!confirmed) {
        return;
    }

    try {

        const response = await fetch(
            `${API_BASE}/admin/orders/${orderId}/status?status=${status}`,
            {
                method: "POST",
                headers: authHeaders()
            }
        );

        if (response.status === 401) {
            logout();
            return;
        }

        if (response.status === 403) {
            showMessage("Admin access required.");
            return;
        }

        const data = await response.json();

        if (!response.ok) {
            throw new Error(
                data.detail || "Status update failed"
            );
        }

        showMessage(
            `Order #${orderId} updated to ${status}`,
            "success"
        );

        await loadOrders();

    } catch (error) {

        console.error(error);

        showMessage(error.message);
    }
}

async function loadPaymentAccounts(){

    const box =
        document.getElementById("paymentAccounts");

    box.innerHTML="Loading...";

    const response =
        await fetch("/payment-accounts");

    const accounts =
        await response.json();


    let html = "";

    accounts.forEach(a=>{

        html += `
        <div class="payment-card">

        <b>${a.method}</b><br>

        ${a.account_number}<br>

        ${a.account_type || ""}
        ${a.network || ""}

        <br>

        <button onclick="togglePayment(${a.id})">
        Toggle
        </button>

        </div>
        `;

    });


    box.innerHTML = html || "No accounts";
}



async function addPaymentAccount(){

    const method =
    document.getElementById("paymentMethod").value;

    const number =
    document.getElementById("paymentNumber").value;


    const type =
    document.getElementById("paymentType").value;


    const network =
    document.getElementById("paymentNetwork").value;


    await fetch(
    `/payment-accounts?method=${method}&account_number=${number}&account_type=${type}&network=${network}`,
    {
        method:"POST",
        headers:authHeaders()
    });


    loadPaymentAccounts();
}



async function togglePayment(id){

    await fetch(
    `/payment-accounts/${id}/toggle`,
    {
        method:"PUT",
        headers:authHeaders()
    });

    loadPaymentAccounts();
}

async function addGame(){

const name =
document.getElementById("gameName").value;

const slug =
document.getElementById("gameSlug").value;

const image =
document.getElementById("gameImage").value;


await fetch(
`/admin/games?name=${name}&slug=${slug}&image_url=${image}`,
{
method:"POST",
headers:authHeaders()
}
);

alert("Game Added");

}



async function addCurrency(){

const gameId =
document.getElementById("currencyGameId").value;

const name =
document.getElementById("currencyName").value;

const symbol =
document.getElementById("currencySymbol").value;


await fetch(
`/admin/games/${gameId}/currency?name=${name}&symbol=${symbol}`,
{
method:"POST",
headers:authHeaders()
}
);

alert("Currency Added");

}



async function addPackage(){

const currencyId =
document.getElementById("packageCurrencyId").value;

const amount =
document.getElementById("packageAmount").value;

const cost =
document.getElementById("packageCost").value;

const selling =
document.getElementById("packageSelling").value;


await fetch(
`/admin/games/currency/${currencyId}/package?amount=${amount}&cost_price=${cost}&selling_price=${selling}`,
{
method:"POST",
headers:authHeaders()
}
);

alert("Package Added");

}
