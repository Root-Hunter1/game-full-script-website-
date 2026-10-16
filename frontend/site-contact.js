/* ApexGamer: use the WhatsApp / phone number saved in Admin Panel > Contact Numbers */
(function () {
    var C = null, pending = false;

    function apply() {
        if (!C) return;
        document.querySelectorAll('a[href*="wa.me"]').forEach(function (a) {
            var h = a.getAttribute("href") || "";
            var n = h.replace(/wa\.me\/\+?\d+/, "wa.me/" + C.whatsapp);
            if (n !== h) a.setAttribute("href", n);
        });
        document.querySelectorAll('a[href^="tel:"]').forEach(function (a) {
            var n = "tel:+" + C.phone;
            if (a.getAttribute("href") !== n) a.setAttribute("href", n);
        });
    }

    function schedule() {
        if (pending) return;
        pending = true;
        requestAnimationFrame(function () { pending = false; apply(); });
    }

    new MutationObserver(schedule).observe(document.documentElement, { childList: true, subtree: true });

    fetch("/site-contact", { cache: "no-store" })
        .then(function (r) { return r.json(); })
        .then(function (d) {
            if (d && d.whatsapp && d.phone) {
                C = d;
                window.APEX_CONTACT = d;
                apply();
            }
        })
        .catch(function () {});
})();
