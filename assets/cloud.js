/* ============================================================
   Cloud module — Supabase auth (Google) + designs & favourites.
   Enabled only when config.js has a project URL + anon key.
   app.js talks to this through window.Cloud.
   ============================================================ */

window.Cloud = (function () {
  "use strict";

  var cfg = window.SUPABASE_CONFIG || {};
  var client = null, user = null, initialized = false;
  var enabled = !!(cfg.url && cfg.anonKey) && !!window.supabase;

  function init() {
    if (!enabled) return Promise.resolve(null);
    if (initialized) return Promise.resolve(user);
    initialized = true;
    try {
      client = window.supabase.createClient(cfg.url, cfg.anonKey);
    } catch (e) {
      enabled = false;
      return Promise.resolve(null);
    }
    return client.auth.getSession().then(function (res) {
      user = res.data && res.data.session ? res.data.session.user : null;
      client.auth.onAuthStateChange(function (_evt, session) {
        var newUser = session ? session.user : null;
        if (newUser !== user) {
          user = newUser;
          document.dispatchEvent(new CustomEvent("cloud:auth", { detail: user }));
        }
      });
      return user;
    }).catch(function () {
      enabled = false;
      return null;
    });
  }

  function requireUser() {
    if (!user) return Promise.reject(new Error("Not signed in"));
    return Promise.resolve(user);
  }

  /* ---- designs ---- */

  function listDesigns() {
    return requireUser().then(function () {
      return client.from("designs").select("*").order("updated_at", { ascending: false });
    }).then(function (res) {
      if (res.error) throw res.error;
      return res.data || [];
    });
  }

  function saveDesign(payload) {
    return requireUser().then(function () {
      payload.user_id = user.id;
      var q = payload.id
        ? client.from("designs").update(payload).eq("id", payload.id).select().single()
        : client.from("designs").insert(payload).select().single();
      return q.then(function (res) {
        if (res.error) throw res.error;
        return res.data;
      });
    });
  }

  function deleteDesign(id) {
    return requireUser().then(function () {
      return client.from("designs").delete().eq("id", id);
    }).then(function (res) {
      if (res.error) throw res.error;
      return true;
    });
  }

  /* ---- favourites ---- */

  function listFavs() {
    return requireUser().then(function () {
      return client.from("favourites").select("design_key").eq("user_id", user.id);
    }).then(function (res) {
      if (res.error) throw res.error;
      return (res.data || []).map(function (r) { return r.design_key; });
    });
  }

  function addFav(key) {
    return requireUser().then(function () {
      return client.from("favourites").upsert({ user_id: user.id, design_key: key });
    }).then(function (res) {
      if (res.error) throw res.error;
      return true;
    });
  }

  function removeFav(key) {
    return requireUser().then(function () {
      return client.from("favourites").delete().eq("user_id", user.id).eq("design_key", key);
    }).then(function (res) {
      if (res.error) throw res.error;
      return true;
    });
  }

  return {
    enabled: function () { return enabled; },
    init: init,
    getUser: function () { return user; },
    signIn: function () {
      return init().then(function () {
        if (!client) throw new Error("Supabase is not configured");
        return client.auth.signInWithOAuth({
          provider: "google",
          options: { redirectTo: location.origin + location.pathname }
        });
      });
    },
    signOut: function () {
      return client ? client.auth.signOut() : Promise.resolve();
    },
    listDesigns: listDesigns,
    saveDesign: saveDesign,
    deleteDesign: deleteDesign,
    listFavs: listFavs,
    addFav: addFav,
    removeFav: removeFav
  };
})();
