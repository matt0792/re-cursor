import "./App.css";
import "bootstrap-icons/font/bootstrap-icons.css";
import { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

// Pages
import ChatPage from "./pages/ChatPage";
import Login from "./pages/Login";
import WaitList from "./pages/WaitList";

// Components
import AuthWrapper from "./components/AuthWrapper";
import Cookies from "./components/Cookies";

const App = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showCookies, setShowCookies] = useState(true);

  return (
    <div className="app">
      {showCookies && <Cookies setShowCookies={setShowCookies} />}
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<Login />} />
          <Route
            path="/chat"
            element={
              <AuthWrapper
                isAuthenticated={isAuthenticated}
                setIsAuthenticated={setIsAuthenticated}
              >
                <ChatPage />
              </AuthWrapper>
            }
          />
          <Route
            path="/wait-list"
            element={
              <AuthWrapper
                isAuthenticated={isAuthenticated}
                setIsAuthenticated={setIsAuthenticated}
              >
                <WaitList />
              </AuthWrapper>
            }
          />
        </Routes>
      </Router>
    </div>
  );
};

export default App;
