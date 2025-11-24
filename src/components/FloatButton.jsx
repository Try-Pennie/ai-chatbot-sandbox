import React from 'react';
import './FloatButton.css';

const FloatButton = ({ icon, onClick, onMouseEnter, onMouseLeave, className, style, ariaLabel, ariaExpanded }) => {
  return (
    <button
      className={`float-button ${className || ''}`}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      style={style}
      aria-label={ariaLabel || "Toggle chat"}
      aria-expanded={ariaExpanded}
      type="button"
    >
      {icon}
    </button>
  );
};

export default FloatButton;
