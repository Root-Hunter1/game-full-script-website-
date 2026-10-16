/* ApexGamer admin: Gift Cards (add card, edit name/photo/price, active/inactive).
   Loaded after admin.js. */
(function () {
    var root = document.getElementById("giftManager");
    if (!root) return;

    var cards = [];

    function esc(v) {
        return String(v == null ? "" : v)
            .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;").replace(/'/g, "&#039;");
    }
    function $(id) { return document.getElementById(id); }
    function val(id) { return $(id).value.trim(); }

    var css = [
        ".gc-card{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:14px;padding:14px;margin:0 0 14px}",
        ".gc-card h3{margin:0 0 10px;font-size:16px;color:#fff}",
        ".gc-card input,.gc-item input{display:block;width:100%;box-sizing:border-box;margin:0 0 8px;padding:11px 12px;font-size:14px;color:#fff;background:#0d1226;border:1px solid rgba(255,255,255,.14);border-radius:10px}",
        ".gc-row{display:grid;grid-template-columns:1fr 1fr;gap:8px}",
        ".gc-btn,.gc-b{padding:10px 14px;border:0;border-radius:10px;font-weight:700;font-size:13px;color:#fff;cursor:pointer;background:linear-gradient(135deg,#5b8cff,#8a6bff)}",
        ".gc-btn{width:100%;padding:12px;font-size:14px}",
        ".gc-hint{font-size:12px;color:#8c98bd;margin:-2px 0 8px}",
        ".gc-msg{display:none;padding:10px 12px;border-radius:10px;margin-bottom:12px;font-size:14px}",
        ".gc-item{border-top:1px solid rgba(255,255,255,.08);padding:12px 0}",
        ".gc-item:first-child{border-top:0}",
        ".gc-item.off .gc-top{opacity:.55}",
        ".gc-top{display:flex;gap:10px;align-items:center}",
        ".gc-top img{width:64px;height:40px;border-radius:8px;object-fit:cover;background:#0d1226;flex:none}",
        ".gc-info b{color:#fff;font-size:14px}",
        ".gc-sub{font-size:12px;color:#8c98bd;margin-top:2px}",
        ".gc-actions{display:flex;gap:8px;margin-top:10px}",
        ".gc-actions .gc-b{flex:1}",
        ".gc-b.gc-edit{background:linear-gradient(135deg,#5b8cff,#8a6bff)}",
        ".gc-b.gc-tog.on{background:#123d2a;color:#5ee6a8;border:1px solid #1f6b4a}",
        ".gc-b.gc-tog.off{background:#451b1b;color:#ff9a7a;border:1px solid #7a2e2e}",
        ".gc-form{margin-top:10px}",
        ".gc-b.gc-cancel{background:rgba(255,255,255,.08)}"
    ].join("");
    var st = document.createElement("style");
    st.textContent = css;
    document.head.appendChild(st);

    root.innerHTML =
        '<div id="gcMsg" class="gc-msg"></div>' +

        '<div class="gc-card"><h3>🎁 Add Gift Card</h3>' +
        '<input id="gcName" placeholder="Card name (e.g. Apple Gift Card)">' +
        '<input id="gcImage" placeholder="Card photo link (https://...)">' +
        '<div class="gc-row"><input id="gcAmount" type="number" inputmode="numeric" placeholder="Card value (optional)">' +
        '<input id="gcPrice" type="text" placeholder="Price (e.g. 650 or 650-700)"></div>' +
        '<div class="gc-hint">Price is what the customer sees. Use a number (170.24) or a range (650-700). Card value can be left empty.</div>' +
        '<button class="gc-btn" id="gcAdd">Add Gift Card</button></div>' +

        '<div class="gc-card"><h3>📋 All Gift Cards</h3><div id="gcList">Loading...</div></div>';

    function msg(text, ok) {
        var b = $("gcMsg");
        b.textContent = text;
        b.style.display = "block";
        b.style.background = ok ? "#123d2a" : "#451b1b";
        b.style.color = ok ? "#5ee6a8" : "#ff7777";
        b.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }

    async function call(method, path, params) {
        var qs = params ? "?" + new URLSearchParams(params).toString() : "";
        var r = await fetch("/admin/gift-cards" + path + qs, { method: method, headers: authHeaders() });
        var body = {};
        try { body = await r.json(); } catch (e) {}
        if (!r.ok) {
            var d = body.detail;
            if (Array.isArray(d)) d = d.map(function (x) { return x.msg; }).join(", ");
            throw new Error(d || ("Error " + r.status));
        }
        return body;
    }

    function render() {
        var h = "";
        cards.forEach(function (c) {
            h += '<div class="gc-item' + (c.is_active ? "" : " off") + '" data-id="' + c.id + '">' +
                '<div class="gc-top"><img src="' + esc(c.image_url || "") + '" alt="">' +
                '<div class="gc-info"><b>' + esc(c.name) + '</b>' +
                '<div class="gc-sub">Price ৳' + esc(c.selling_price) + ' · Value ' + esc(c.amount) + ' · ID ' + c.id + '</div></div></div>' +
                '<div class="gc-actions">' +
                '<button class="gc-b gc-edit" data-act="edit">Edit</button>' +
                '<button class="gc-b gc-tog ' + (c.is_active ? "on" : "off") + '" data-act="toggle">' +
                (c.is_active ? "Active" : "Inactive") + '</button></div>' +
                '<div class="gc-form" style="display:none">' +
                '<input class="f-name" value="' + esc(c.name) + '" placeholder="Card name">' +
                '<input class="f-img" value="' + esc(c.image_url || "") + '" placeholder="Card photo link">' +
                '<div class="gc-row">' +
                '<input class="f-amt" type="number" inputmode="numeric" value="' + esc(c.amount) + '" placeholder="Card value">' +
                '<input class="f-price" type="text" value="' + esc(c.selling_price) + '" placeholder="Selling price"></div>' +
                '<div class="gc-row">' +
                '<button class="gc-b" data-act="save">Save</button>' +
                '<button class="gc-b gc-cancel" data-act="cancel">Cancel</button></div>' +
                '</div></div>';
        });
        $("gcList").innerHTML = h || "No gift cards yet.";
    }

    async function load() {
        try {
            cards = await call("GET", "");
            render();
        } catch (e) {
            $("gcList").textContent = "Could not load: " + e.message;
        }
    }

    $("gcAdd").onclick = async function () {
        if (!val("gcName")) return msg("Card name is required", false);
        if (!val("gcPrice")) return msg("Selling price is required", false);
        var b = $("gcAdd");
        b.disabled = true;
        try {
            var res = await call("POST", "", {
                name: val("gcName"), image_url: val("gcImage"),
                amount: val("gcAmount") || "0", selling_price: val("gcPrice")
            });
            msg(res.message + " (ID " + res.id + ")", true);
            $("gcName").value = ""; $("gcImage").value = ""; $("gcAmount").value = ""; $("gcPrice").value = "";
            await load();
        } catch (e) {
            msg(e.message, false);
        } finally {
            b.disabled = false;
        }
    };

    $("gcList").onclick = async function (e) {
        var btn = e.target.closest("[data-act]");
        if (!btn) return;
        var item = btn.closest(".gc-item");
        var id = item.getAttribute("data-id");
        var act = btn.getAttribute("data-act");
        var form = item.querySelector(".gc-form");

        if (act === "edit") { form.style.display = form.style.display === "none" ? "block" : "none"; return; }
        if (act === "cancel") { form.style.display = "none"; return; }

        btn.disabled = true;
        try {
            var res;
            if (act === "toggle") {
                res = await call("POST", "/" + id + "/toggle");
            } else {
                var name = item.querySelector(".f-name").value.trim();
                var price = item.querySelector(".f-price").value.trim();
                if (!name) throw new Error("Card name is required");
                if (!price) throw new Error("Selling price is required");
                res = await call("PUT", "/" + id, {
                    name: name, image_url: item.querySelector(".f-img").value.trim(),
                    amount: item.querySelector(".f-amt").value.trim() || "0", selling_price: price
                });
            }
            msg(res.message, true);
            await load();
        } catch (err) {
            msg(err.message, false);
            btn.disabled = false;
        }
    };

    load();
})();
