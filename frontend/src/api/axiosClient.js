import axios from "axios";
const axiosClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:5000",
});
axiosClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  const m = (config.method || "").toLowerCase();
  const isWrite =
    m === "post" || m === "put" || m === "patch" || m === "delete";
  const isFormData =
    typeof FormData !== "undefined" && config.data instanceof FormData;
  if (isWrite && !isFormData) {
    config.headers["Content-Type"] = "application/json";
  }
  return config;
});
export default axiosClient;
