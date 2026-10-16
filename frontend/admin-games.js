/* ApexGamer admin: Game Management (add game + image link, currency,
   package prices, supplier mapping). Loaded after admin.js. */
(function () {
    var root = document.getElementById("gameManager");
    if (!root) return;

    var data = [];

    // ---- Hide / Show button on the Game Management title ----
    (function () {
        var h = root.previousElementSibling;
        if (!h || h.tagName !== "H2") return;
        h.style.display = "flex";
        h.style.alignItems = "center";
        h.style.justifyContent = "space-between";
        h.style.gap = "10px";
        var b = document.createElement("button");
        b.type = "button";
        b.id = "gmHideBtn";
        b.textContent = "🙈 Hide";
        b.style.cssText = "padding:7px 12px;border-radius:999px;font-size:12px;font-weight:700;cursor:pointer;border:1px solid rgba(255,255,255,.2);background:rgba(255,255,255,.08);color:#fff";
        function setHidden(v) {
            root.style.display = v ? "none" : "";
            b.textContent = v ? "👁 Show" : "🙈 Hide";
        }
        b.onclick = function () {
            var v = root.style.display !== "none";
            setHidden(v);
            try { if (v) localStorage.setItem("gm_hide_games", "1"); else localStorage.removeItem("gm_hide_games"); } catch (e) {}
        };
        try { if (localStorage.getItem("gm_hide_games") === "1") setHidden(true); } catch (e) {}
        h.appendChild(b);
    })();

    // ---- gmHideMore: Hide / Show button for Gift Cards and Payment Accounts ----
    (function () {
        var st2 = document.createElement("style");
        st2.textContent = ".gm-collapsed > :not(h2){display:none !important}";
        document.head.appendChild(st2);
        document.querySelectorAll("section.admin-section > h2").forEach(function (h) {
            var name = h.textContent;
            if (name.indexOf("Gift Cards") < 0 && name.indexOf("Payment Accounts") < 0) return;
            var sec = h.parentElement;
            h.style.display = "flex";
            h.style.alignItems = "center";
            h.style.justifyContent = "space-between";
            h.style.gap = "10px";
            var b = document.createElement("button");
            b.type = "button";
            b.textContent = "🙈 Hide";
            b.style.cssText = "padding:7px 12px;border-radius:999px;font-size:12px;font-weight:700;cursor:pointer;border:1px solid rgba(255,255,255,.2);background:rgba(255,255,255,.08);color:#fff";
            var key = "gm_hide_" + (name.indexOf("Gift Cards") >= 0 ? "gifts" : "payments");
            function setHide2(v) {
                sec.classList.toggle("gm-collapsed", v);
                b.textContent = v ? "👁 Show" : "🙈 Hide";
            }
            b.onclick = function () {
                var v = !sec.classList.contains("gm-collapsed");
                setHide2(v);
                try { if (v) localStorage.setItem(key, "1"); else localStorage.removeItem(key); } catch (e) {}
            };
            try { if (localStorage.getItem(key) === "1") setHide2(true); } catch (e) {}
            h.appendChild(b);
        });
    })();

    function esc(v) {
        return String(v == null ? "" : v)
            .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;").replace(/'/g, "&#039;");
    }
    function $(id) { return document.getElementById(id); }
    function val(id) { return $(id).value.trim(); }

    var css = [
        ".gm-card{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:14px;padding:14px;margin:0 0 14px}",
        ".gm-card h3{margin:0 0 10px;font-size:16px;color:#fff}",
        ".gm-card input,.gm-card select{display:block;width:100%;box-sizing:border-box;margin:0 0 8px;padding:11px 12px;font-size:14px;color:#fff;background:#0d1226;border:1px solid rgba(255,255,255,.14);border-radius:10px}",
        ".gm-row{display:grid;grid-template-columns:1fr 1fr;gap:8px}",
        ".gm-card button.gm-btn{width:100%;padding:12px;border:0;border-radius:10px;font-weight:700;font-size:14px;color:#fff;cursor:pointer;background:linear-gradient(135deg,#5b8cff,#8a6bff)}",
        ".gm-hint{font-size:12px;color:#8c98bd;margin:-2px 0 8px}",
        ".gm-msg{display:none;padding:10px 12px;border-radius:10px;margin-bottom:12px;font-size:14px}",
        ".gm-game{display:flex;gap:10px;align-items:center;margin:10px 0 4px}",
        ".gm-game img{width:42px;height:42px;border-radius:8px;object-fit:cover;background:#0d1226}",
        ".gm-game b{color:#fff}",
        ".gm-cur{margin:6px 0 2px;color:#cfd8ff;font-size:13px;font-weight:700}",
        ".gm-pkg{font-size:12px;color:#aab4d8;padding:3px 0 3px 10px;border-left:2px solid rgba(91,140,255,.35)}",
        ".gm-ok{color:#5ee6a8}.gm-no{color:#ff9a7a}",
        ".gm-del{margin-left:8px;padding:4px 9px;border-radius:8px;border:1px solid #7a2e2e;background:#451b1b;color:#ff9a7a;font-size:13px;cursor:pointer}",
        ".gm-game .gm-del{padding:7px 11px}",
        ".gm-tog{margin-left:auto;padding:7px 12px;border-radius:999px;font-size:12px;font-weight:700;cursor:pointer;border:1px solid transparent}",
        ".gm-tog.on{background:#123d2a;color:#5ee6a8;border-color:#1f6b4a}",
        ".gm-tog.off{background:#451b1b;color:#ff9a7a;border-color:#7a2e2e}",
        ".gm-edit{padding:6px 9px;border-radius:8px;border:1px solid rgba(255,255,255,.2);background:rgba(255,255,255,.08);color:#fff;font-size:14px;line-height:1;cursor:pointer}",
        ".gm-editbox{padding:10px;margin:4px 0 10px;border:1px solid rgba(91,140,255,.35);border-radius:12px;background:rgba(255,255,255,.03)}",
        ".gm-lab{display:block;font-size:11px;color:#8c98bd;margin:0 0 2px}"
    ].join("");
    var st = document.createElement("style");
    st.textContent = css;
    document.head.appendChild(st);

    root.innerHTML =
        '<div id="gmMsg" class="gm-msg"></div>' +

        '<div class="gm-card"><h3>🎮 Add Game</h3>' +
        '<input id="gmName" placeholder="Game name (e.g. Free Fire)">' +
        '<input id="gmSlug" placeholder="Slug (e.g. free-fire) - optional">' +
        '<input id="gmImage" placeholder="Game image link (https://...)">' +
        '<button class="gm-btn" id="gmAddGame">Add Game</button></div>' +

        '<div class="gm-card"><h3>💎 Add Currency</h3>' +
        '<select id="gmCurGame"></select>' +
        '<input id="gmCurName" placeholder="Currency name (e.g. Diamonds)">' +
        '<button class="gm-btn" id="gmAddCur">Add Currency</button></div>' +

        '<div class="gm-card"><h3>💰 Add Package + Price</h3>' +
        '<select id="gmPkgCur"></select>' +
        '<div class="gm-row"><input id="gmPkgAmount" type="number" step="any" inputmode="decimal" placeholder="Amount (e.g. 100 or 101.20)">' +
        '<input id="gmPkgName" placeholder="Label (optional)"></div>' +
        '<div class="gm-row"><input id="gmPkgCost" type="number" step="any" inputmode="decimal" placeholder="Cost price">' +
        '<input id="gmPkgSell" type="number" step="any" inputmode="decimal" placeholder="Selling price"></div>' +
        '<div class="gm-hint">Decimals allowed (e.g. 170.24). Cost = what you pay the supplier, Selling = what the customer pays.</div>' +
        '<button class="gm-btn" id="gmAddPkg">Add Package</button></div>' +

        '<div class="gm-card"><h3>🔗 Supplier Price Mapping</h3>' +
        '<select id="gmMapPkg"></select>' +
        '<input id="gmMapSupplier" value="vertexbazaar" placeholder="Supplier name">' +
        '<div class="gm-row"><input id="gmMapProduct" placeholder="Supplier product ID">' +
        '<input id="gmMapVariation" placeholder="Variation ID"></div>' +
        '<div class="gm-hint">Links the package to the supplier so orders are topped up automatically. Saving again for the same package updates its mapping.</div>' +
        '<button class="gm-btn" id="gmAddMap">Save Mapping</button></div>' +

        '<div class="gm-card"><div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin:0 0 10px"><h3 style="margin:0">📋 All Games</h3>' +
        '<button type="button" id="gmPhotoBtn" class="gm-btn" style="width:auto;padding:7px 12px;font-size:12px">🖼 Change Photos</button></div>' +
        '<div id="gmPhotoPanel" style="display:none;margin:0 0 12px"></div><div id="gmList">Loading...</div></div>';

    function msg(text, ok) {
        var b = $("gmMsg");
        b.textContent = text;
        b.style.display = "block";
        b.style.background = ok ? "#123d2a" : "#451b1b";
        b.style.color = ok ? "#5ee6a8" : "#ff7777";
        b.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }

    async function call(method, path, params) {
        var qs = params ? "?" + new URLSearchParams(params).toString() : "";
        var r = await fetch("/admin/games" + path + qs, { method: method, headers: authHeaders() });
        var body = {};
        try { body = await r.json(); } catch (e) {}
        if (!r.ok) {
            var d = body.detail;
            if (Array.isArray(d)) d = d.map(function (x) { return x.msg; }).join(", ");
            throw new Error(d || ("Error " + r.status));
        }
        return body;
    }

    function fillSelect(id, html, emptyText) {
        var s = $(id), prev = s.value;
        s.innerHTML = html || '<option value="">' + emptyText + "</option>";
        if (prev && s.querySelector('option[value="' + prev + '"]')) s.value = prev;
    }

    function render() {
        var games = "", curs = "", pkgs = "", list = "";

        data.forEach(function (g) {
            games += '<option value="' + g.id + '">' + esc(g.name) + "</option>";
            var curOpts = "", pkgOpts = "";

            list += '<div class="gm-game"' + (g.is_active ? "" : ' style="opacity:.55"') + '><img src="' + esc(g.image_url || "") + '" alt="">' +
                "<div><b>" + esc(g.name) + '</b><div class="gm-hint" style="margin:0">ID ' + g.id +
                " · " + esc(g.slug) + "</div></div>" +
                '<button type="button" class="gm-edit" data-id="' + g.id + '" title="Edit">📝</button>' +
                '<button class="gm-tog ' + (g.is_active ? "on" : "off") + '" data-id="' + g.id + '">' +
                (g.is_active ? "Active" : "Inactive") + "</button>" +
                '<button class="gm-del" data-type="game" data-id="' + g.id + '">🗑</button></div>' +
                '<div class="gm-editbox" id="gmEdit' + g.id + '" style="display:none"></div>';

            g.currencies.forEach(function (c) {
                curOpts += '<option value="' + c.id + '">' + esc(c.name) + " (ID " + c.id + ")</option>";
                list += '<div class="gm-cur">' + esc(c.name) + " · ID " + c.id +
                    '<button class="gm-del" data-type="currency" data-id="' + c.id + '">🗑</button></div>';
                var pOpts = "";
                c.packages.forEach(function (p) {
                    var mapped = !!p.mapping;
                    pOpts += '<option value="' + p.id + '">' + esc(p.amount) + " — sell " + esc(p.selling_price) +
                        (mapped ? " ✓" : " (not mapped)") + "</option>";
                    list += '<div class="gm-pkg">' + esc(p.amount) + (p.package_name ? " (" + esc(p.package_name) + ")" : "") +
                        " · cost " + esc(p.cost_price) + " → sell " + esc(p.selling_price) + " · " +
                        (mapped
                            ? '<span class="gm-ok">mapped ' + esc(p.mapping.supplier_product_id) + "/" + esc(p.mapping.supplier_variation_id || "-") + "</span>"
                            : '<span class="gm-no">not mapped</span>') +
                        '<button class="gm-del" data-type="package" data-id="' + p.id + '">🗑</button></div>';
                });
                if (pOpts) pkgOpts += '<optgroup label="' + esc(g.name + " — " + c.name) + '">' + pOpts + "</optgroup>";
            });

            if (curOpts) curs += '<optgroup label="' + esc(g.name) + '">' + curOpts + "</optgroup>";
            pkgs += pkgOpts;
        });

        fillSelect("gmCurGame", games, "Add a game first");
        fillSelect("gmPkgCur", curs, "Add a currency first");
        fillSelect("gmMapPkg", pkgs, "Add a package first");
        $("gmList").innerHTML = list || "No games yet.";
    }

    async function load() {
        try {
            data = await call("GET", "/overview");
            render();
        } catch (e) {
            $("gmList").textContent = "Could not load: " + e.message;
        }
    }

    async function run(btnId, fn, okText) {
        var b = $(btnId);
        b.disabled = true;
        try {
            var res = await fn();
            msg((res && res.message ? res.message : okText) + (res && res.id ? " (ID " + res.id + ")" : ""), true);
            await load();
            return true;
        } catch (e) {
            msg(e.message, false);
            return false;
        } finally {
            b.disabled = false;
        }
    }

    $("gmAddGame").onclick = async function () {
        if (!val("gmName")) return msg("Game name is required", false);
        var ok = await run("gmAddGame", function () {
            return call("POST", "", { name: val("gmName"), slug: val("gmSlug"), image_url: val("gmImage") });
        });
        if (ok) { $("gmName").value = ""; $("gmSlug").value = ""; $("gmImage").value = ""; }
    };

    $("gmAddCur").onclick = async function () {
        if (!val("gmCurGame")) return msg("Select a game first", false);
        if (!val("gmCurName")) return msg("Currency name is required", false);
        var ok = await run("gmAddCur", function () {
            return call("POST", "/" + val("gmCurGame") + "/currency", { name: val("gmCurName"), symbol: val("gmCurName").slice(0, 50) });
        });
        if (ok) { $("gmCurName").value = ""; }
    };

    $("gmAddPkg").onclick = async function () {
        if (!val("gmPkgCur")) return msg("Select a currency first", false);
        if (!val("gmPkgAmount") || val("gmPkgCost") === "" || val("gmPkgSell") === "")
            return msg("Amount, cost price and selling price are required", false);
        var ok = await run("gmAddPkg", function () {
            return call("POST", "/currency/" + val("gmPkgCur") + "/package", {
                amount: val("gmPkgAmount"), cost_price: val("gmPkgCost"),
                selling_price: val("gmPkgSell"), package_name: val("gmPkgName")
            });
        });
        if (ok) { $("gmPkgAmount").value = ""; $("gmPkgName").value = ""; $("gmPkgCost").value = ""; $("gmPkgSell").value = ""; }
    };

    $("gmAddMap").onclick = async function () {
        if (!val("gmMapPkg")) return msg("Select a package first", false);
        if (!val("gmMapProduct")) return msg("Supplier product ID is required", false);
        var ok = await run("gmAddMap", function () {
            return call("POST", "/mapping", {
                package_id: val("gmMapPkg"), supplier_name: val("gmMapSupplier"),
                supplier_product_id: val("gmMapProduct"), supplier_variation_id: val("gmMapVariation")
            });
        });
        if (ok) { $("gmMapProduct").value = ""; $("gmMapVariation").value = ""; }
    };

    $("gmList").onclick = async function (e) {
        var b = e.target.closest(".gm-tog");
        if (!b) return;
        b.disabled = true;
        try {
            var res = await call("POST", "/" + b.getAttribute("data-id") + "/toggle");
            msg(res.message, true);
            await load();
        } catch (err) {
            msg(err.message, false);
            b.disabled = false;
        }
    };

    $("gmList").addEventListener("click", async function (e) {
        var b = e.target.closest(".gm-del");
        if (!b) return;
        var type = b.getAttribute("data-type");
        var id = Number(b.getAttribute("data-id"));
        var text = "";

        data.forEach(function (g) {
            if (type === "game" && g.id === id) {
                var n = 0;
                g.currencies.forEach(function (c) { n += c.packages.length; });
                text = 'Delete game "' + g.name + '" with ' + g.currencies.length + " currencies and " + n + " packages? This cannot be undone.";
            }
            g.currencies.forEach(function (c) {
                if (type === "currency" && c.id === id) {
                    text = 'Delete currency "' + c.name + '" of ' + g.name + " with " + c.packages.length + " packages? This cannot be undone.";
                }
                c.packages.forEach(function (p) {
                    if (type === "package" && p.id === id) {
                        text = "Delete package " + p.amount + " (" + c.name + " of " + g.name + ")? This cannot be undone.";
                    }
                });
            });
        });

        if (!text || !window.confirm(text)) return;

        b.disabled = true;
        try {
            var res = await call("DELETE", "/" + type + "/" + id);
            msg(res.message, true);
            await load();
        } catch (err) {
            msg(err.message, false);
            b.disabled = false;
        }
    });

    // ---- Change photos of all games (small button in All Games card) ----
    $("gmPhotoBtn").onclick = function () {
        var p = $("gmPhotoPanel");
        if (p.style.display !== "none") { p.style.display = "none"; return; }
        var h = '<div class="gm-hint">Paste a new image link for any game, then press Save Photos. Empty boxes are left as they are.</div>';
        data.forEach(function (g) {
            h += '<div class="gm-game" style="margin:8px 0 2px"><img src="' + esc(g.image_url || "") + '" alt=""><b>' + esc(g.name) + "</b></div>" +
                '<input class="gm-photo-in" data-id="' + g.id + '" data-old="' + esc(g.image_url || "") + '" value="' + esc(g.image_url || "") + '" placeholder="Image link (https://...)">';
        });
        h += '<button type="button" class="gm-btn" id="gmPhotoSave">Save Photos</button>';
        p.innerHTML = h;
        p.style.display = "block";

        $("gmPhotoSave").onclick = async function () {
            var b = this, ins = p.querySelectorAll(".gm-photo-in"), done = 0, failed = [];
            b.disabled = true;
            for (var i = 0; i < ins.length; i++) {
                var v = ins[i].value.trim();
                if (!v || v === ins[i].getAttribute("data-old")) continue;
                try {
                    await call("POST", "/" + ins[i].getAttribute("data-id") + "/image", { image_url: v });
                    done++;
                } catch (err) {
                    failed.push(ins[i].previousSibling.textContent + ": " + err.message);
                }
            }
            b.disabled = false;
            if (failed.length) msg(done + " updated. Failed - " + failed.join("; "), false);
            else msg(done ? done + " photo(s) updated" : "Nothing changed", true);
            if (done) { p.style.display = "none"; await load(); }
        };
    };

    // ---- gmToast: small message at the bottom of the screen (no scrolling) ----
    function gmToast(text, ok) {
        var t = document.getElementById("gmToast");
        if (!t) {
            t = document.createElement("div");
            t.id = "gmToast";
            t.style.cssText = "position:fixed;left:50%;bottom:24px;transform:translateX(-50%);max-width:90%;padding:11px 16px;border-radius:12px;font-size:14px;font-weight:700;z-index:99999;box-shadow:0 6px 20px rgba(0,0,0,.4);transition:opacity .25s;pointer-events:none";
            document.body.appendChild(t);
        }
        t.textContent = text;
        t.style.background = ok ? "#123d2a" : "#451b1b";
        t.style.color = ok ? "#5ee6a8" : "#ff7777";
        t.style.border = "1px solid " + (ok ? "#1f6b4a" : "#7a2e2e");
        t.style.opacity = "1";
        clearTimeout(t._h);
        t._h = setTimeout(function () { t.style.opacity = "0"; }, ok ? 2200 : 5000);
    }

    // ---- gmEditBtn: small edit button next to each game name ----
    $("gmList").addEventListener("click", function (e) {
        var eb = e.target.closest(".gm-edit");
        if (!eb) return;
        var id = Number(eb.getAttribute("data-id"));
        var box = $("gmEdit" + id);
        if (!box) return;
        if (box.style.display !== "none") { box.style.display = "none"; return; }
        var g = data.filter(function (x) { return x.id === id; })[0];
        if (!g) return;

        function f(kind, rid, field, label, value, num) {
            return '<label class="gm-lab">' + label + '<input class="gm-e" data-kind="' + kind +
                '" data-id="' + rid + '" data-field="' + field + '" data-old="' + esc(value) +
                '" value="' + esc(value) + '"' + (num ? ' type="number" step="any" inputmode="decimal"' : "") + "></label>";
        }

        var h = '<div class="gm-hint">Change what you need, then press Save Changes. Only changed boxes are saved.</div>' +
            f("game", g.id, "name", "Game name", g.name);
        g.currencies.forEach(function (c) {
            h += f("cur", c.id, "name", "Currency name", c.name);
            c.packages.forEach(function (p) {
                h += '<div class="gm-pkg"><div class="gm-row">' +
                    f("pkg", p.id, "amount", "Amount", p.amount, 1) +
                    f("pkg", p.id, "package_name", "Label", p.package_name || "") +
                    f("pkg", p.id, "cost_price", "Cost price", p.cost_price, 1) +
                    f("pkg", p.id, "selling_price", "Selling price", p.selling_price, 1) +
                    "</div></div>";
            });
        });
        h += '<button type="button" class="gm-btn" id="gmEditSave' + id + '">Save Changes</button>';
        box.innerHTML = h;
        box.style.display = "block";

        $("gmEditSave" + id).onclick = async function () {
            var sb = this, done = 0, failed = [], pk = {};
            var ins = box.querySelectorAll(".gm-e");
            sb.disabled = true;
            for (var i = 0; i < ins.length; i++) {
                var el = ins[i];
                if (el.value.trim() === el.getAttribute("data-old")) continue;
                var kind = el.getAttribute("data-kind"), rid = el.getAttribute("data-id");
                if (kind === "pkg") { pk[rid] = 1; continue; }
                try {
                    if (kind === "game") await call("POST", "/" + rid + "/rename", { name: el.value.trim() });
                    else await call("POST", "/currency/" + rid + "/rename", { name: el.value.trim() });
                    done++;
                } catch (err) { failed.push(err.message); }
            }
            for (var pid in pk) {
                var q = {};
                ["amount", "cost_price", "selling_price", "package_name"].forEach(function (fld) {
                    q[fld] = box.querySelector('.gm-e[data-kind="pkg"][data-id="' + pid + '"][data-field="' + fld + '"]').value.trim();
                });
                try {
                    await call("POST", "/package/" + pid + "/update", q);
                    done++;
                } catch (err) { failed.push(err.message); }
            }
            sb.disabled = false;
            var keepY = window.pageYOffset;
            if (failed.length) gmToast(done + " saved. Failed - " + failed.join("; "), false);
            else gmToast(done ? "✅ " + done + " change(s) saved" : "Nothing changed", true);
            if (done) { await load(); window.scrollTo(0, keepY); }
        };
    });

    load();
})();
