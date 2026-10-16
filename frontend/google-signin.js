/* ===== GOOGLE SIGN-IN (login + signup with phone's Gmail) ===== */
(async function () {
    const modal = document.getElementById("loginModal");
    const msg = document.getElementById("loginMessage");
    if (!modal || !msg) return;

    const base = (typeof API !== "undefined") ? API : "";

    let clientId = "";
    try {
        const res = await fetch(base + "/auth/google/config");
        const cfg = await res.json();
        clientId = cfg.client_id || "";
    } catch (e) {
        return;
    }
    // No client id configured -> show nothing (design unchanged)
    if (!clientId) return;

    await new Promise(function (resolve, reject) {
        const s = document.createElement("script");
        s.src = "https://accounts.google.com/gsi/client";
        s.async = true;
        s.onload = resolve;
        s.onerror = reject;
        document.head.appendChild(s);
    }).catch(function () { return null; });

    if (!window.google || !google.accounts || !google.accounts.id) return;

    const wrap = document.createElement("div");
    wrap.style.cssText = "margin-top:14px;text-align:center;";
    wrap.innerHTML =
        '<div style="display:flex;align-items:center;gap:10px;color:#64748b;font-size:13px;margin-bottom:12px;">' +
        '<div style="flex:1;height:1px;background:#e2e8f0;"></div>or' +
        '<div style="flex:1;height:1px;background:#e2e8f0;"></div></div>' +
        '<div id="googleSignInBtn" style="display:flex;justify-content:center;"></div>';
    msg.parentNode.insertBefore(wrap, msg);

    google.accounts.id.initialize({
        client_id: clientId,
        callback: async function (response) {
            msg.textContent = "Signing in with Google...";
            try {
                const res = await fetch(base + "/auth/google", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ credential: response.credential })
                });
                const data = await res.json();
                if (!res.ok) {
                    throw new Error(data.detail || "Google sign-in failed");
                }
                localStorage.setItem("access_token", data.access_token);
                msg.textContent = "Login successful!";
                setTimeout(function () {
                    if (typeof closeLogin === "function") closeLogin();
                }, 800);
            } catch (err) {
                console.error(err);
                msg.textContent = err.message;
            }
        }
    });

    function renderBtn() {
        const box = document.getElementById("googleSignInBtn");
        if (!box) return;
        const inputs = Array.from(modal.querySelectorAll("input"));
        const iw = Math.max(0, ...inputs.map(function (i) { return i.offsetWidth; }));
        const width = Math.round(Math.min(400, Math.max(200, iw || 280)));
        box.innerHTML = "";
        google.accounts.id.renderButton(box, {
            theme: "outline",
            size: "large",
            shape: "rectangular",
            text: "continue_with",
            width: width
        });
    }

    new MutationObserver(function () {
        if (getComputedStyle(modal).display !== "none") renderBtn();
    }).observe(modal, { attributes: true, attributeFilter: ["style", "class"] });

    if (getComputedStyle(modal).display !== "none") renderBtn();
})();
