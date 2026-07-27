(function () {
  "use strict";

  /**
   * Browser-safe Supabase configuration.
   * The publishable key is intentionally public. Never add a service_role key.
   */
  window.CHOROMI_NOTICE_CONFIG = {
    siteBaseUrl: "https://choromi1.github.io/games",
    supabaseUrl: "https://dteuxildoqpgrqqiuilw.supabase.co",
    supabaseAnonKey: "sb_publishable_DluO77PqPoP1siSilXIdQg_u0oWriQA",
    notice: {
      pageSize: 8,
      homeRecentCount: 3,
      realtime: true
    }
  };
})();
