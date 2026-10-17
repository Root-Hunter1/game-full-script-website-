async function adminLogin(){

    const email =
        document.getElementById("email").value;

    const password =
        document.getElementById("password").value;

    const msg =
        document.getElementById("msg");

    msg.innerText = "Checking...";

    try{

        const body = new URLSearchParams();

        body.append("username", email);
        body.append("password", password);


        const login =
            await fetch("/auth/login", {
                method:"POST",
                headers:{
                    "Content-Type":
                    "application/x-www-form-urlencoded"
                },
                body: body.toString()
            });


        const data =
            await login.json();


        if(!login.ok){
            throw new Error(
                data.detail || "Login failed"
            );
        }


        localStorage.setItem(
            "admin_token",
            data.access_token
        );


        const me =
            await fetch("/users/me",{
                headers:{
                    "Authorization":
                    `Bearer ${data.access_token}`
                }
            });


        const user =
            await me.json();


        if(!user.is_admin){

            localStorage.removeItem(
                "admin_token"
            );

            throw new Error(
                "Admin access required"
            );
        }


        window.location.href =
            "/admin.html";


    }catch(e){

        msg.innerText =
            e.message;
    }
}


/* Auto-login: valid token thakle login form na dekhiye admin panel e pathao */
(async function autoLogin(){
    const t = localStorage.getItem("admin_token");
    if(!t) return;
    try{
        const me = await fetch("/users/me", {
            headers: { "Authorization": `Bearer ${t}` }
        });
        if(me.ok){
            const u = await me.json();
            if(u.is_admin){
                window.location.replace("/admin.html");
                return;
            }
        }
        if(me.status === 401){
            localStorage.removeItem("admin_token");
        }
    }catch(e){}
})();


/* Secret link login: /admin-login.html?key=KEY */
(async function keyLogin(){
    let k = new URLSearchParams(location.search).get("key");
    try{
        if(k) localStorage.setItem("admin_key", k);
        else k = localStorage.getItem("admin_key");
    }catch(e){}
    if(!k) return;
    try{
        const r = await fetch("/auth/admin-key-login", {
            method:"POST",
            headers:{ "Content-Type":"application/json" },
            body: JSON.stringify({ key: k })
        });
        if(!r.ok){ try{localStorage.removeItem("admin_key");}catch(e){} return; }
        const d = await r.json();
        localStorage.setItem("admin_token", d.access_token);
        window.location.replace("/admin.html");
    }catch(e){}
})();
