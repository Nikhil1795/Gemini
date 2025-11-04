import React from "react";

function ColorChips({ matchedGroup }) {
  return (
    <div className="color-chips-container">
      <p className="behr-color-title">Here are some of the Behr's color details.</p>
      {matchedGroup.colors.map((colorDetails, index) => (
        <a
          key={index}
          href={colorDetails["color-detail-page-url"]}
          target="_blank"
          className="color-chip"
        >
          <div className="color-chip-top" style={{ backgroundColor: colorDetails["color-hex"] }}>
          </div>
          <div className="color-chip-bottom">
            <p className="color-name">{colorDetails["color-name"]}</p>
            <p className="color-code">{colorDetails["color-code"]}</p>
          </div>
        </a>
      ))}
    </div>
  );
}

export default ColorChips;
