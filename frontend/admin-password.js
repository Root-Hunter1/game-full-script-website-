/* ApexGamer admin: Change Password section (bottom of the admin panel) */
(function () {
    var all = document.querySelectorAll("section.admin-section");
    if (!all.length || document.getElementById("pwBox")) return;

    var st = document.createElement("style");
    st.textContent =
        ".pw-collapsed > :not(h2){display:none !important}" +
        "#pwBox input[type=password],#pwBox input[type=text]{display:block;width:100%;box-sizing:border-box;margin:0 0 10px;padding:11px 12px;font-size:14px;color:#fff;background:#0d1226;border:1px solid rgba(255,255,255,.14);border-radius:10px}" +
        "#pwBox label.pw-l{display:block;font-size:12px;color:#8c98bd;margin:0 0 4px}" +
        "#pwBox .pw-show{display:flex;align-items:center;gap:8px;font-size:13px;color:#cfd8ff;margin:0 0 12px}" +
        "#pwSave{width:100%;padding:12px;border:0;border-radius:10px;font-weight:700;font-size:14px;color:#fff;cursor:pointer;background:linear-gradient(135deg,#5b8cff,#8a6bff)}" +
        "#pwSave:disabled{opacity:.6}";
    document.head.appendChild(st);

    var sec = document.createElement("section");
    sec.className = "admin-section";
    sec.innerHTML =
        "<h2>\uD83D\uDD11 Change Password</h2>" +
        '<div id="pwBox">' +
        '<div id="pwMsg" style="display:none;padding:10px 12px;border-radius:10px;margin-bottom:10px;font-size:14px"></div>' +
        '<label class="pw-l" for="pwCur">Current password</label><input id="pwCur" type="password" autocomplete="current-password">' +
        '<label class="pw-l" for="pwNew">New password (min 8 characters)</label><input id="pwNew" type="password" autocomplete="new-password">' +
        '<label class="pw-l" for="pwNew2">Type the new password again</label><input id="pwNew2" type="password" autocomplete="new-password">' +
        '<label class="pw-show"><input type="checkbox" id="pwShow"> Show passwords</label>' +
        '<button type="button" id="pwSave">Change Password</button></div>';
    all[all.length - 1].insertAdjacentElement("afterend", sec);

    function $(id) { return document.getElementById(id); }

    var h = sec.querySelector("h2");
    h.style.display = "flex";
    h.style.alignItems = "center";
    h.style.justifyContent = "space-between";
    h.style.gap = "10px";
    var hb = document.createElement("button");
    hb.type = "button";
    hb.style.cssText = "padding:7px 12px;border-radius:999px;font-size:12px;font-weight:700;cursor:pointer;border:1px solid rgba(255,255,255,.2);background:rgba(255,255,255,.08);color:#fff";
    function setHide(v) {
        sec.classList.toggle("pw-collapsed", v);
        hb.textContent = v ? "\uD83D\uDC41 Show" : "\uD83D\uDE48 Hide";
    }
    hb.onclick = function () { setHide(!sec.classList.contains("pw-collapsed")); };
    setHide(true);
    h.appendChild(hb);

    function show(text, ok) {
        var m = $("pwMsg");
        m.textContent = text;
        m.style.display = "block";
        m.style.background = ok ? "#123d2a" : "#451b1b";
        m.style.color = ok ? "#5ee6a8" : "#ff7777";
    }

    $("pwShow").onchange = function () {
        var t = this.checked ? "text" : "password";
        ["pwCur", "pwNew", "pwNew2"].forEach(function (id) { $(id).type = t; });
    };

    $("pwSave").onclick = async function () {
        var cur = $("pwCur").value, n1 = $("pwNew").value, n2 = $("pwNew2").value;
        if (!cur || !n1 || !n2) return show("Fill all three boxes.", false);
        if (n1 !== n2) return show("The two new passwords do not match.", false);
        if (n1.length < 8) return show("New password must be at least 8 characters.", false);

        var b = this;
        b.disabled = true;
        try {
            var hd = authHeaders();
            hd["Content-Type"] = "application/json";
            var r = await fetch("/auth/change-password", {
                method: "POST",
                headers: hd,
                body: JSON.stringify({ current_password: cur, new_password: n1 })
            });
            var d = {};
            try { d = await r.json(); } catch (e) {}
            if (r.status === 401) { if (typeof logout === "function") logout(); return; }
            if (!r.ok) {
                var det = d.detail;
                if (Array.isArray(det)) det = det.map(function (x) { return x.msg; }).join(", ");
                throw new Error(det || ("Error " + r.status));
            }
            $("pwCur").value = "";
            $("pwNew").value = "";
            $("pwNew2").value = "";
            show("\u2705 Password changed. Use the new password next time you log in.", true);
        } catch (e) {
            show(e.message, false);
        } finally {
            b.disabled = false;
        }
    };
})();
