import "./Cookies.css";

const Cookies = ({ setShowCookies }) => {
  const hideCookies = () => {
    setShowCookies(false);
  };

  return (
    <div className="cookies-card">
      <div className="cookie-heading">Cookie Policy</div>
      <div className="cookie-para">
        This website requires cookies to provide key features.
      </div>
      <div className="button-wrapper">
        <button className="accept cookie-button" onClick={() => hideCookies()}>
          Accept
        </button>
      </div>
    </div>
  );
};

export default Cookies;
