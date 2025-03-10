import "./ToolSettings.css";
import { useState, useEffect } from "react";

const ToolSettings = ({ tools, setActiveTools, activeTools, toggleTool }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  return (
    <div
      className={`${isExpanded ? "expanded" : ""} tool-settings`}
      onMouseEnter={() => setIsExpanded(true)}
      onMouseLeave={() => setIsExpanded(false)}
    >
      {!isExpanded && (
        <div className="tool-settings-icon-container">
          <i className="bi bi-info-square tool-settings-icon"></i>
        </div>
      )}
      {isExpanded && (
        <div className="tool-list-container">
          {tools.map((tool, index) => (
            <div
              className="tool-list-item"
              key={index}
              onClick={() => toggleTool(tool.name)}
            >
              <div className="tool-list-info">
                <div className="tool-list-name">{tool.name}</div>
                <div className="tool-list-desc">{tool.description}</div>
              </div>
              {/* <div className="tool-list-toggle">
                <span className="orange">[</span>
                <div className="toggle-text">
                  {activeTools.includes(tool.name) ? "on" : "off"}
                </div>
                <span className="orange">]</span>
              </div> */}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ToolSettings;
