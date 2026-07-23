/**
 * Public client configuration.
 * Supabase anon key is designed to be used in browser apps.
 * Never place the service_role key in this file.
 */
window.ZOMBOID_CONFIG = {
  siteBaseUrl: "https://choromi1.github.io/games/zomboid",

  // Replace these two values after creating the Supabase project.
  supabaseUrl: "https://dteuxildoqpgrqqiuilw.supabase.co",
  supabaseAnonKey: "sb_publishable_DluO77PqPoP1siSilXIdQg_u0oWriQA",

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
