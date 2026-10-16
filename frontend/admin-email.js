/* ApexGamer admin: Change Admin Gmail section (bottom of the admin panel) */
(function () {
    var all = document.querySelectorAll("section.admin-section");
    if (!all.length || document.getElementById("emBox")) return;

    var st = document.createElement("style");
    st.textContent =
        ".em-collapsed > :not(h2){display:none !important}" +
        "#emBox input{display:block;width:100%;box-sizing:border-box;margin:0 0 10px;padding:11px 12px;font-size:14px;color:#fff;background:#0d1226;border:1px solid rgba(255,255,255,.14);border-radius:10px}" +
        "#emBox label.em-l{display:block;font-size:12px;color:#8c98bd;margin:0 0 4px}" +
        "#emBox .em-cur{font-size:14px;color:#cfd8ff;margin:0 0 12px;word-break:break-all}" +
        "#emBox .em-hint{font-size:12px;color:#8c98bd;margin:-2px 0 12px}" +
        "#emSave{width:100%;padding:12px;border:0;border-radius:10px;font-weight:700;font-size:14px;color:#fff;cursor:pointer;background:linear-gradient(135deg,#5b8cff,#8a6bff)}" +
        "#emSave:disabled{opacity:.6}";
    document.head.appendChild(st);

    var sec = document.createElement("section");
    sec.className = "admin-section";
    sec.innerHTML =
        "<h2>\u2709\uFE0F Change Admin Gmail</h2>" +
        '<div id="emBox">' +
        '<div id="emMsg" style="display:none;padding:10px 12px;border-radius:10px;margin-bottom:10px;font-size:14px"></div>' +
        '<div class="em-cur">Current Gmail: <b id="emCur">loading...</b></div>' +
        '<label class="em-l" for="emNew">New Gmail</label><input id="emNew" type="email" autocomplete="off" placeholder="name@gmail.com">' +
        '<label class="em-l" for="emPass">Your current password</label><input id="emPass" type="password" autocomplete="current-password">' +
        '<div class="em-hint">Use a Gmail you own. This Gmail is used to log in to the admin panel and to receive password reset emails.</div>' +
        '<button type="button" id="emSave">Change Gmail</button></div>';
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
        sec.classList.toggle("em-collapsed", v);
        hb.textContent = v ? "\uD83D\uDC41 Show" : "\uD83D\uDE48 Hide";
    }
    hb.onclick = function () { setHide(!sec.classList.contains("em-collapsed")); };
    setHide(true);
    h.appendChild(hb);

    function show(text, ok) {
        var m = $("emMsg");
        m.textContent = text;
        m.style.display = "block";
        m.style.background = ok ? "#123d2a" : "#451b1b";
        m.style.color = ok ? "#5ee6a8" : "#ff7777";
    }

    fetch("/users/me", { headers: authHeaders() })
        .then(function (r) { return r.json(); })
        .then(function (d) { $("emCur").textContent = d.email || "unknown"; })
        .catch(function () { $("emCur").textContent = "could not load"; });

    $("emSave").onclick = async function () {
        var email = $("emNew").value.trim().toLowerCase(), pw = $("emPass").value;
        if (!email || !pw) return show("Fill both boxes.", false);
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return show("Type a valid Gmail address.", false);

        var b = this;
        b.disabled = true;
        try {
            var hd = authHeaders();
            hd["Content-Type"] = "application/json";
            var r = await fetch("/auth/change-email", {
                method: "POST",
                headers: hd,
                body: JSON.stringify({ new_email: email, current_password: pw })
            });
            var d = {};
            try { d = await r.json(); } catch (e) {}
            if (r.status === 401) { if (typeof logout === "function") logout(); return; }
            if (!r.ok) {
                var det = d.detail;
                if (Array.isArray(det)) det = det.map(function (x) { return x.msg; }).join(", ");
                throw new Error(det || ("Error " + r.status));
            }
            $("emCur").textContent = d.email || email;
            $("emNew").value = "";
            $("emPass").value = "";
            show("\u2705 Gmail changed. Use this new Gmail next time you log in.", true);
        } catch (e) {
            show(e.message, false);
        } finally {
            b.disabled = false;
        }
    };
})();
