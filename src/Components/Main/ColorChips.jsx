import React from "react";

function ColorChips({ matchedGroup }) {
  return (
    <div className="color-chips-container">
      <p className="behr-color-title">
        Showing you the results for {matchedGroup["color-group"] || "your color"} colors.
      </p>
      <div className="color-chips">
        {matchedGroup.colors.map((colorDetails, index) => (
          <div key={index}>
            <a
              href={`https://www.behr.com/consumer/ColorDetailView/${colorDetails['color-code']}`}
              target="_blank"
              className="color-chip"
            >
              <div className="color-chip-top" style={{ backgroundColor: colorDetails["color-hex"] }}></div>
              </a>

              <div className="color-chip-bottom">
                <p className="color-name">{colorDetails["color-name"]}</p>
                <p className="color-code">{colorDetails["color-code"]}</p>
                <p className="color-hex">{colorDetails["color-hex"]}</p>
                {colorDetails.percentDiff && (
                  <p className="color-diff">Difference: {colorDetails.percentDiff}%</p>
                )}
              </div>
            
          </div>
        ))}
      </div>
    </div>
  );
}

export default ColorChips;
