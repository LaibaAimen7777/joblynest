import React from "react";
import "../styles/Loader.css";

const Loader = ({ message = "Loading..." }) => {
  return (
    <div className="app-loader-overlay">
      <div className="app-loader-spinner" />
      {message && <p className="app-loader-text">{message}</p>}
    </div>
  );
};

export default Loader;
