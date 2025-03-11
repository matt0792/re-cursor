import "./ChatPage.css";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

// Components
import Chat from "../components/Chat";

const ChatPage = () => {
  const [userInfo, setUserInfo] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUserInfo = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) throw new Error("No token found");

        const response = await fetch("http://localhost:3000/auth/user-info", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error("Failed to fetch user info");
        }

        const data = await response.json();
        setUserInfo(data);

        if (data.role !== "admin") {
          navigate("/wait-list");
        }
      } catch (error) {
        console.error("Error fetching user info:", error);
        return null;
      }
    };

    fetchUserInfo();
  }, []);

  return (
    <div className="chat-page">
      <Chat />
    </div>
  );
};

export default ChatPage;
