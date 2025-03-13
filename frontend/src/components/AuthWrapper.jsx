import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const AuthWrapper = ({
  children,
  isAuthenticated,
  setIsAuthenticated,
  routeModifier,
}) => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);

  routeModifier = routeModifier || "";

  useEffect(() => {
    const validateToken = async () => {
      const token = localStorage.getItem("token");

      if (!token) {
        navigate("/login");
        return;
      }

      try {
        const response = await fetch(`${API_BASE_URL}/auth/validate`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error("Validation failed");
        }

        const data = await response.json();

        if (data.valid) {
          setIsAuthenticated(true);
        } else {
          throw new Error("Invalid token");
        }
      } catch (error) {
        // localStorage.removeItem("token");
        navigate("/login");
      } finally {
        setIsLoading(false);
      }
    };

    validateToken();
  }, [navigate, setIsAuthenticated]);

  return isAuthenticated ? children : null;
};

export default AuthWrapper;
