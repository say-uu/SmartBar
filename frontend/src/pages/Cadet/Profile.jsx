import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function Profile() {
  const navigate = useNavigate();
  useEffect(() => {
    navigate("/cadet/profile/settings", { replace: true });
  }, [navigate]);
  return null;
}
