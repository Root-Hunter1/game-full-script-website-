/* ApexGamer admin: compact payment account cards + edit popup.
   Loaded after admin.js / admin-mobile.js. Does not change any other feature. */
(function () {
    var box = document.getElementById("paymentAccounts");
    if (!box) return;

    var accounts = {};

    function esc(v) {
        return String(v == null ? "" : v)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    /* ---------- styles ---------- */
    var css = [
        "#paymentAccounts.apx-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:8px;margin-top:6px}",
        ".payment-card.apx-pay{display:block;min-width:0;margin:0;padding:10px 12px;font-size:13px;line-height:1.35}",
        ".apx-top{display:flex;align-items:center;justify-content:space-between;gap:6px}",
        ".apx-top b{font-size:14px;color:#fff}",
        ".apx-meta{font-size:11px;color:#8c98bd;margin-top:2px}",
        ".apx-num{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:12px;color:#cfd8ff;margin:6px 0 8px;word-break:break-all;line-height:1.3}",
        ".apx-actions{display:flex;gap:6px}",
        ".payment-card.apx-pay .apx-actions button{flex:1;margin:0;padding:6px 10px;font-size:12px;border-radius:8px;cursor:pointer}",
        ".payment-card.apx-pay button.apx-edit{background:linear-gradient(135deg,#5b8cff,#8a6bff);color:#fff;border:0;font-weight:700}",
        ".payment-card.apx-pay button.apx-toggle{background:rgba(255,255,255,.06);color:#9db9ff;border:1px solid rgba(91,140,255,.35);font-weight:600}",
        ".apx-overlay{position:fixed;left:0;top:0;right:0;bottom:0;z-index:1000;background:rgba(3,6,15,.72);-webkit-backdrop-filter:blur(4px);backdrop-filter:blur(4px);display:flex;align-items:flex-end;justify-content:center;overflow:auto}",
        ".apx-sheet{width:100%;max-width:460px;box-sizing:border-box;background:#0f152a;border:1px solid rgba(255,255,255,.1);border-radius:20px 20px 0 0;padding:16px 16px 20px;box-shadow:0 -10px 40px rgba(0,0,0,.5);animation:apxUp .25s ease;color:#fff}",
        "@media(min-width:769px){.apx-overlay{align-items:center}.apx-sheet{border-radius:20px}}",
        ".apx-sheet-title{font-size:17px;font-weight:800;margin-bottom:4px}",
        ".apx-sheet label{display:block;font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#8c98bd;margin:10px 0 4px}",
        ".apx-sheet input{display:block;width:100%;box-sizing:border-box;padding:11px 12px;font-size:16px;background:rgba(7,11,24,.8);color:#fff;border:1px solid #2b3658;border-radius:10px;outline:none}",
        ".apx-sheet input:focus{border-color:#5b8cff;box-shadow:0 0 0 3px rgba(91,140,255,.22)}",
        ".apx-row{display:flex;gap:8px;margin-top:14px}",
        ".apx-row button{flex:1;padding:11px;border-radius:10px;font-weight:700;font-size:14px;border:0;cursor:pointer}",
        ".apx-save{background:linear-gradient(135deg,#1fbf86,#12926a);color:#fff}",
        ".apx-save:disabled{opacity:.6}",
        ".apx-cancel{background:rgba(255,255,255,.08);color:#cfd8ff}",
        ".apx-err{color:#ff7b88;font-size:13px;margin-top:8px}",
        ".payment-card.apx-pay button.apx-photo{display:block;width:100%;margin:6px 0 0;padding:6px 10px;font-size:12px;border-radius:8px;cursor:pointer;background:rgba(255,255,255,.06);color:#9db9ff;border:1px solid rgba(91,140,255,.35);font-weight:600}",
        "@keyframes apxUp{from{transform:translateY(24px);opacity:0}to{transform:translateY(0);opacity:1}}"
    ].join("\n");

    var styleEl = document.createElement("style");
    styleEl.textContent = css;
    document.head.appendChild(styleEl);

    /* ---------- compact list ---------- */
    function render(list) {
        accounts = {};

        if (!list.length) {
            box.classList.remove("apx-grid");
            box.textContent = "No accounts";
            return;
        }

        box.classList.add("apx-grid");

        box.innerHTML = list.map(function (a) {
            accounts[a.id] = a;

            var meta = [a.account_type, a.network].filter(Boolean).join(" \u00b7 ");

            return (
                '<div class="payment-card apx-pay">' +
                    '<div class="apx-top"><b>' + esc(a.method) + "</b></div>" +
                    (meta ? '<div class="apx-meta">' + esc(meta) + "</div>" : "") +
                    '<div class="apx-num">' + esc(a.account_number) + "</div>" +
                    '<div class="apx-actions">' +
                        '<button type="button" class="apx-edit" data-apx-edit="' + Number(a.id) + '">\u270e Edit</button>' +
                        '<button type="button" class="apx-toggle" data-apx-toggle="' + Number(a.id) + '">Toggle</button>' +
                    "</div>" +
                    '<button type="button" class="apx-photo" data-apx-photo="' + Number(a.id) + '">\uD83D\uDDBC Change Photo</button>' +
                "</div>"
            );
        }).join("");
    }

    async function load() {
        try {
            var res = await fetch("/payment-accounts");
            var list = await res.json();
            render(Array.isArray(list) ? list : []);
        } catch (e) {
            console.error(e);
            box.textContent = "Failed to load accounts";
        }
    }

    window.loadPaymentAccounts = load;

    box.addEventListener("click", function (ev) {
        var t = ev.target;
        if (!t || !t.getAttribute) return;

        var photoId = t.getAttribute("data-apx-photo");
        if (photoId) { openPhoto(Number(photoId)); return; }

        var editId = t.getAttribute("data-apx-edit");
        if (editId) { openEdit(Number(editId)); return; }

        var toggleId = t.getAttribute("data-apx-toggle");
        if (toggleId && typeof window.togglePayment === "function") {
            window.togglePayment(Number(toggleId));
        }
    });

    /* if the old renderer from admin.js finishes after us, redraw ours */
    new MutationObserver(function () {
        if (box.querySelector(".payment-card:not(.apx-pay)")) load();
    }).observe(box, { childList: true });

    /* ---------- edit popup ---------- */
    function field(id, label, value, placeholder) {
        return (
            '<label for="' + id + '">' + label + "</label>" +
            '<input id="' + id + '" type="text" autocomplete="off" value="' + esc(value) + '" placeholder="' + esc(placeholder || "") + '">'
        );
    }

    function val(id) {
        var el = document.getElementById(id);
        return el ? el.value : "";
    }

    function setErr(msg) {
        var el = document.getElementById("apxErr");
        if (el) el.textContent = msg || "";
    }

    function closeEdit() {
        var o = document.getElementById("apxEditOverlay");
        if (o) o.parentNode.removeChild(o);
        document.removeEventListener("keydown", onKey);
    }

    function onKey(ev) {
        if (ev.key === "Escape") closeEdit();
    }

    function openEdit(id) {
        var a = accounts[id];
        if (!a) return;

        closeEdit();

        var o = document.createElement("div");
        o.className = "apx-overlay";
        o.id = "apxEditOverlay";

        o.innerHTML =
            '<div class="apx-sheet" role="dialog" aria-modal="true">' +
                '<div class="apx-sheet-title">Edit ' + esc(a.method) + "</div>" +
                field("apxMethod", "Method", a.method, "bKash / Nagad / USDT") +
                field("apxNumber", "Account Number / Address", a.account_number, "") +
                field("apxType", "Type", a.account_type, "personal / merchant") +
                field("apxNetwork", "Network", a.network, "TRC20 / ERC20") +
                field("apxImage", "Logo URL", a.image_url, "https://...") +
                '<div class="apx-err" id="apxErr"></div>' +
                '<div class="apx-row">' +
                    '<button type="button" class="apx-cancel" id="apxCancel">Cancel</button>' +
                    '<button type="button" class="apx-save" id="apxSave">Save</button>' +
                "</div>" +
            "</div>";

        document.body.appendChild(o);
        document.addEventListener("keydown", onKey);

        o.addEventListener("click", function (ev) {
            if (ev.target === o) closeEdit();
        });
        document.getElementById("apxCancel").addEventListener("click", closeEdit);
        document.getElementById("apxSave").addEventListener("click", function () {
            save(id);
        });
    }

    async function save(id) {
        var body = {
            method: val("apxMethod").trim(),
            account_number: val("apxNumber").trim(),
            account_type: val("apxType").trim(),
            network: val("apxNetwork").trim(),
            image_url: val("apxImage").trim()
        };

        if (!body.method || !body.account_number) {
            setErr("Method and account number are required.");
            return;
        }

        var btn = document.getElementById("apxSave");
        btn.disabled = true;
        btn.textContent = "Saving...";
        setErr("");

        try {
            var headers = authHeaders();
            headers["Content-Type"] = "application/json";

            var res = await fetch("/payment-accounts/" + id, {
                method: "PUT",
                headers: headers,
                body: JSON.stringify(body)
            });

            if (res.status === 401) { logout(); return; }

            var data = {};
            try { data = await res.json(); } catch (e) {}

            if (res.status === 403) throw new Error("Admin access required.");

            if (!res.ok) {
                throw new Error(
                    typeof data.detail === "string" ? data.detail : "Update failed"
                );
            }

            closeEdit();
            if (typeof showMessage === "function") {
                showMessage("Payment account updated.", "success");
            }
            await load();
        } catch (e) {
            console.error(e);
            setErr(e.message || "Update failed");
            btn.disabled = false;
            btn.textContent = "Save";
        }
    }

    /* ---------- quick logo (photo) change ---------- */
    function openPhoto(id) {
        var a = accounts[id];
        if (!a) return;

        closeEdit();

        var o = document.createElement("div");
        o.className = "apx-overlay";
        o.id = "apxEditOverlay";

        o.innerHTML =
            '<div class="apx-sheet" role="dialog" aria-modal="true">' +
                '<div class="apx-sheet-title">Change photo - ' + esc(a.method) + "</div>" +
                '<div style="display:flex;align-items:center;gap:12px;margin:10px 0 2px">' +
                    '<img id="apxPhotoPrev" src="' + esc(a.image_url || "") + '" alt="" style="width:56px;height:56px;flex:none;border-radius:12px;object-fit:cover;background:#0b1020;border:1px solid #2b3658">' +
                    '<div style="font-size:12px;color:#8c98bd">Paste a new logo link (https://...). Leave it empty to remove the photo.</div>' +
                "</div>" +
                field("apxImage", "Logo URL", a.image_url, "https://...") +
                '<div class="apx-err" id="apxErr"></div>' +
                '<div class="apx-row">' +
                    '<button type="button" class="apx-cancel" id="apxCancel">Cancel</button>' +
                    '<button type="button" class="apx-save" id="apxSave">Save Photo</button>' +
                "</div>" +
            "</div>";

        document.body.appendChild(o);
        document.addEventListener("keydown", onKey);

        o.addEventListener("click", function (ev) {
            if (ev.target === o) closeEdit();
        });
        document.getElementById("apxCancel").addEventListener("click", closeEdit);
        document.getElementById("apxImage").addEventListener("input", function () {
            document.getElementById("apxPhotoPrev").src = this.value.trim();
        });
        document.getElementById("apxSave").addEventListener("click", function () {
            savePhoto(id);
        });
    }

    async function savePhoto(id) {
        var a = accounts[id];
        if (!a) return;

        var v = val("apxImage").trim();

        if (v && !/^(https?:\/\/|\/)/i.test(v)) {
            setErr("Logo link must start with https://");
            return;
        }

        var body = {
            method: a.method,
            account_number: a.account_number,
            account_type: a.account_type || "",
            network: a.network || "",
            image_url: v
        };

        var btn = document.getElementById("apxSave");
        btn.disabled = true;
        btn.textContent = "Saving...";
        setErr("");

        try {
            var headers = authHeaders();
            headers["Content-Type"] = "application/json";

            var res = await fetch("/payment-accounts/" + id, {
                method: "PUT",
                headers: headers,
                body: JSON.stringify(body)
            });

            if (res.status === 401) { logout(); return; }

            var data = {};
            try { data = await res.json(); } catch (e) {}

            if (res.status === 403) throw new Error("Admin access required.");

            if (!res.ok) {
                throw new Error(
                    typeof data.detail === "string" ? data.detail : "Update failed"
                );
            }

            closeEdit();
            if (typeof showMessage === "function") {
                showMessage("Payment photo updated.", "success");
            }
            await load();
        } catch (e) {
            console.error(e);
            setErr(e.message || "Update failed");
            btn.disabled = false;
            btn.textContent = "Save Photo";
        }
    }

    load();
})();
