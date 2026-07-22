/**
 * Public client configuration.
 * Supabase anon key is designed to be used in browser apps.
 * Never place the service_role key in this file.
 */
window.ZOMBOID_CONFIG = {
  siteBaseUrl: "https://choromi1.github.io/games/zomboid",

  // Replace these two values after creating the Supabase project.
  supabaseUrl: "https://YOUR_PROJECT_ID.supabase.co",
  supabaseAnonKey: "YOUR_SUPABASE_ANON_KEY",

  steamCollectionUrl: "",
  discordInviteUrl: "",

  server: {
    gameVersion: "Build 42",
    playerCount: "4~5명",
    status: "준비 중",
    statusMessage: "구성과 모드 테스트를 진행하고 있습니다.",
    openDate: "오픈일 추후 공지",
    address: "",
    port: "16261",
    passwordLabel: "참가자 별도 안내"
  },

  notice: {
    pageSize: 8,
    homeRecentCount: 3,
    realtime: true
  }
};
