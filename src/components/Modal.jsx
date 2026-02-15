import React from "react";
import {
  FiAlertTriangle,
  FiCheckCircle,
  FiInfo,
  FiX,
} from "react-icons/fi";
import "../styles/Modal.css";

const Modal = ({ title, message, onClose, type = "info" }) => {
  const variantConfig = {
    success: { icon: <FiCheckCircle />, className: "modal-success" },
    error: { icon: <FiAlertTriangle />, className: "modal-error" },
    info: { icon: <FiInfo />, className: "modal-info" },
    warning: { icon: <FiAlertTriangle />, className: "modal-warning" },
  };

  const { icon, className } =
    variantConfig[type] || variantConfig.info;

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true">
      <div className={`modal-card ${className}`}>
        <button
          className="modal-close-button"
          aria-label="Close"
          onClick={onClose}
        >
          <FiX />
        </button>
        <div className="modal-icon">{icon}</div>
        <div className="modal-body">
          <h3>{title}</h3>
          <p>{message}</p>
        </div>
        <div className="modal-actions">
          <button className="allow-btn" onClick={onClose}>
            OK
          </button>
        </div>
      </div>
    </div>
  );
};

export default Modal;
