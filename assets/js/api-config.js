(function configureApi() {
  const productionApi = "https://jerin-api.flyai.online/x006";
  const localApi = "http://127.0.0.1:9007";
  const useLocalApi = new URLSearchParams(window.location.search).get("api") === "local";

  window.UR_BANGLA_API_BASE = window.UR_BANGLA_API_BASE || (useLocalApi ? localApi : productionApi);
  window.UR_BANGLA_API_MODE = useLocalApi ? "local" : "production";
})();
