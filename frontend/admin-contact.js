/* ApexGamer admin: Contact Details (WhatsApp, phone, email shown on the website) */
(function () {
    var last = document.querySelectorAll("section.admin-section");
    if (!last.length) return;

    var st = document.createElement("style");
    st.textContent =
        ".ct-collapsed > :not(h2){display:none !important}" +
        "#ctBox input{display:block;width:100%;box-sizing:border-box;margin:0 0 10px;padding:11px 12px;font-size:14px;color:#fff;background:#0d1226;border:1px solid rgba(255,255,255,.14);border-radius:10px}" +
        "#ctBox label{display:block;font-size:12px;color:#8c98bd;margin:0 0 4px}" +
        "#ctSave{width:100%;padding:12px;border:0;border-radius:10px;font-weight:700;font-size:14px;color:#fff;cursor:pointer;background:linear-gradient(135deg,#5b8cff,#8a6bff)}";
    document.head.appendChild(st);

    var sec = document.createElement("section");
    sec.className = "admin-section";
    sec.innerHTML =
        "<h2>📞 Contact Details</h2>" +
        '<div id="ctBox">' +
        '<div id="ctMsg" style="display:none;padding:10px 12px;border-radius:10px;margin-bottom:10px;font-size:14px"></div>' +
        '<label for="ctWhatsapp">WhatsApp number</label><input id="ctWhatsapp" placeholder="01XXXXXXXXX">' +
        '<label for="ctPhone">Phone number</label><input id="ctPhone" placeholder="01XXXXXXXXX">' +
        '<label for="ctEmail">Gift card email</label><input id="ctEmail" type="email" placeholder="name@gmail.com">' +
        '<button type="button" id="ctSave">Save Contact Details</button></div>';
    last[last.length - 1].insertAdjacentElement("afterend", sec);

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
        sec.classList.toggle("ct-collapsed", v);
        hb.textContent = v ? "👁 Show" : "🙈 Hide";
    }
    hb.onclick = function () {
        var v = !sec.classList.contains("ct-collapsed");
        setHide(v);
        try { if (v) localStorage.setItem("gm_hide_contact", "1"); else localStorage.removeItem("gm_hide_contact"); } catch (e) {}
    };
    setHide(false);
    try { if (localStorage.getItem("gm_hide_contact") === "1") setHide(true); } catch (e) {}
    h.appendChild(hb);

    function show(text, ok) {
        var m = $("ctMsg");
        m.textContent = text;
        m.style.display = "block";
        m.style.background = ok ? "#123d2a" : "#451b1b";
        m.style.color = ok ? "#5ee6a8" : "#ff7777";
    }
    function local(n) { return n && n.indexOf("880") === 0 ? "0" + n.slice(3) : (n ? "+" + n : ""); }
    function fill(d) {
        $("ctWhatsapp").value = local(d.whatsapp);
        $("ctPhone").value = local(d.phone);
        $("ctEmail").value = d.email || "";
    }

    fetch("/site-contact", { cache: "no-store" })
        .then(function (r) { return r.json(); })
        .then(fill)
        .catch(function () { show("Could not load current details", false); });

    $("ctSave").onclick = async function () {
        var b = this;
        b.disabled = true;
        try {
            var hd = authHeaders();
            hd["Content-Type"] = "application/json";
            var r = await fetch("/admin/site-contact", {
                method: "POST",
                headers: hd,
                body: JSON.stringify({
                    whatsapp: $("ctWhatsapp").value.trim(),
                    phone: $("ctPhone").value.trim(),
                    email: $("ctEmail").value.trim()
                })
            });
            var body = {};
            try { body = await r.json(); } catch (e) {}
            if (!r.ok) {
                var d = body.detail;
                if (Array.isArray(d)) d = d.map(function (x) { return x.msg; }).join(", ");
                throw new Error(d || ("Error " + r.status));
            }
            fill(body);
            show("Saved. The website now uses these details.", true);
        } catch (e) {
            show(e.message, false);
        } finally {
            b.disabled = false;
        }
    };
})();
