import React, { useState, useEffect, useRef } from "react";
import "./Main.css";
import Fuse from "fuse.js";
import synonyms from "../synonyms";
import customQA from "../customQA";
import colorGroups from "../colorGroups";
import axios from "axios";
import { assets } from "../../assets/assets";
import SpeechRecognition, { useSpeechRecognition } from "react-speech-recognition";

function Main() {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [chatHistory, setChatHistory] = useState([]);
  const [lastTopic, setLastTopic] = useState("");
  const chatEndRef = useRef(null);

  // Auto-scroll
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory]);

  // Normalize synonyms
  function normalizeQuestion(input) {
    return input
      .toLowerCase()
      .split(" ")
      .map((word) => synonyms[word] || word)
      .join(" ");
  }

  // 🟩 Get all color group names from JSON dynamically
  const allColorGroups = colorGroups[0]["color-groups"].map((g) =>
    g["color-group"].toLowerCase()
  );

  // ✅ Generate Answer (priority: color → custom → gemini)
  async function generateAnswer() {
    if (!question.trim()) return;
    setLoading(true);
    SpeechRecognition.stopListening();

    const normalized = normalizeQuestion(question);
    let botResponse = "";

    // 🎯 STEP 1: Find if any color name appears in question
    const matchedColor = allColorGroups.find((colorName) =>
      new RegExp(`\\b${colorName}\\b`, "i").test(normalized)
    );

    if (matchedColor) {
      const matchedGroup = colorGroups[0]["color-groups"].find(
        (g) => g["color-group"].toLowerCase() === matchedColor
      );

      if (matchedGroup) {
        // ✅ Found color — build nice HTML response
        botResponse =
          `<b>${matchedGroup["color-group"]} Colors</b><br><br>` +
          matchedGroup.colors
            .map(
              (c) => `
              <div style="margin-bottom:10px;padding:8px;border-radius:8px;border:1px solid #ddd;background:#fafafa;">
                <div style="display:flex;align-items:center;gap:10px;">
                  <div style="width:25px;height:25px;background:${c["color-hex"]};border:1px solid #ccc;border-radius:4px;"></div>
                  <b>${c["color-name"]}</b> <small>(${c["color-code"]})</small>
                </div>
                <div style="margin-top:5px;">
                  <b>Hex:</b> <code>${c["color-hex"]}</code><br/>
                  <a href="${c["color-detail-page-url"]}" target="_blank">View Details</a>
                </div>
              </div>`
            )
            .join("");

        setChatHistory((prev) => [
          ...prev,
          { type: "user", text: question },
          { type: "bot", text: botResponse },
        ]);
        setAnswer(botResponse);
        setLastTopic(matchedColor);
        setQuestion("");
        resetTranscript();
        setLoading(false);
        return; // ⛔ Skip Gemini
      }
    }

    // 🟦 STEP 2: Check custom Q&A
    const fuse = new Fuse(customQA, { keys: ["question"], threshold: 0.3 });
    const customMatch = fuse.search(normalized);

    if (customMatch.length > 0) {
      botResponse = customMatch[0].item.answer;
    } else {
      // 🟥 STEP 3: Fallback → Gemini API
      try {
        const response = await axios({
          url: "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=AIzaSyB6ZvDo3qUvuonroMCdWePm8ey8SchCkbk",
          method: "post",
          data: {
            contents: [{ parts: [{ text: question }] }],
          },
        });

        botResponse =
          response.data.candidates[0]?.content?.parts[0]?.text ||
          "Sorry, I didn’t get that.";

        botResponse = botResponse
          .replace(/\*\*(.*?)\*\*/g, "<b>$1</b>")
          .replace(/\*(.*?)\*/g, "<i>$1</i>")
          .replace(/\n/g, "<br>");
      } catch (err) {
        botResponse = "⚠️ Error fetching response from Gemini API.";
      }
    }

    // 🧾 Update chat
    setChatHistory((prev) => [
      ...prev,
      { type: "user", text: question },
      { type: "bot", text: botResponse },
    ]);

    setAnswer(botResponse);
    setLastTopic(question);
    setQuestion("");
    resetTranscript();
    setLoading(false);
  }

  // Press Enter to send
  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      generateAnswer();
    }
  };

  // 🎙️ Speech Recognition
  const {
    transcript,
    listening,
    resetTranscript,
    browserSupportsSpeechRecognition,
  } = useSpeechRecognition();

  useEffect(() => {
    if (transcript) setQuestion(transcript);
  }, [transcript]);

  const startListening = () => {
    resetTranscript();
    SpeechRecognition.startListening({ continuous: true, language: "en-IN" });
  };

  const stopListening = () => {
    SpeechRecognition.stopListening();
  };

  if (!browserSupportsSpeechRecognition) {
    return alert("Your browser does not support speech recognition.");
  }

  // 🧾 Formatting text safely
  function formatMessage(text) {
    if (!text) return "";
    let formatted = text
      .replace(/\*\*(.*?)\*\*/g, "<b>$1</b>")
      .replace(/\*(.*?)\*/g, "<i>$1</i>")
      .replace(/\n/g, "<br>");
    return formatted;
  }

  return (
    <div className="main">
      <div className="nav">
        <p>Gemini Chat</p>
        <img src={assets.user_icon} alt="user" />
      </div>

      <div className="main-container">
        <div className="chat-window">
          {chatHistory.length === 0 ? (
            <div className="greet">
              <p><span>Hi Dev 👋</span></p>
              <p>Ask me anything or just say hi!</p>
            </div>
          ) : (
            chatHistory.map((msg, i) => (
              <div key={i} className={`chat-bubble ${msg.type}`}>
                <img
                  src={msg.type === "bot" ? assets.gemini_icon : assets.user_icon}
                  alt=""
                />
                <p
                  dangerouslySetInnerHTML={{ __html: formatMessage(msg.text) }}
                ></p>
              </div>
            ))
          )}
          <div ref={chatEndRef}></div>
        </div>

        <div className="main-bottom">
          <div className="search-box">
            <input
              type="text"
              placeholder="Type your question..."
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={handleKeyPress}
            />
            <div>
              <img
                src={assets.mic_icon}
                alt="mic"
                onClick={listening ? stopListening : startListening}
                title={listening ? "Listening..." : "Start Listening"}
                style={{
                  filter: listening ? "drop-shadow(0 0 5px #4caf50)" : "none",
                  cursor: "pointer",
                }}
              />
            </div>
            <div>
              <img
                src={assets.send_icon}
                alt="send"
                onClick={generateAnswer}
                style={{ cursor: "pointer" }}
              />
            </div>
          </div>

          {loading && <p className="loading">Thinking...</p>}
          <p className="bottom-info">
            ⚠️ Gemini may provide inaccurate information. Kindly verify your own answers.
          </p>
        </div>
      </div>
    </div>
  );
}

export default Main;
