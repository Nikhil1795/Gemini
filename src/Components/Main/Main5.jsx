// src/components/Main.jsx
import React, { useState, useEffect, useRef } from "react";
import "./Main.css";
import Fuse from "fuse.js";
import synonyms from "../synonyms";
import customQA from "../customQA";
import axios from "axios";
import { assets } from "../../assets/assets";
import SpeechRecognition, { useSpeechRecognition } from "react-speech-recognition";

function Main() {
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [chatHistory, setChatHistory] = useState([]);

  const chatEndRef = useRef(null);

  // Scrolls to last message
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory]);

  // Normalize input using synonyms
  function normalizeQuestion(input) {
    return input
      .toLowerCase()
      .split(" ")
      .map((word) => synonyms[word] || word)
      .join(" ");
  }

  // Generate Answer (Custom QnA + Gemini fallback)
  async function generateAnswer() {
    if (!question.trim()) return;
    setLoading(true);

    // Stop mic if active
    SpeechRecognition.stopListening();

    const normalized = normalizeQuestion(question);
    const fuse = new Fuse(customQA, { keys: ["question"], threshold: 0.2 });
    const customMatch = fuse.search(normalized);

    let botResponse = "";
    
    // ✅ Check for close match (only if at least one word overlaps)
    if (customMatch.length > 0) {
      const top = customMatch[0];
      const questionWords = normalized.split(" ");
      const matchedWords = top.item.question
        .split(" ")
        .filter((w) => questionWords.includes(w)).length;

      // Accept only if question shares 50%+ of words (avoids “what is js” ≈ “what is your name”)
      if (matchedWords / questionWords.length >= 0.5) {
        botResponse = top.item.answer;
      }
    }

    if (!botResponse) {
      // Gemini API fallback
      try {
        const response = await axios({
          url: "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=AIzaSyB6ZvDo3qUvuonroMCdWePm8ey8SchCkbk",
          method: "post",
          data: {
            contents: [{ parts: [{ text: question }] }],
          },
        });

        const rawText =
          response.data.candidates[0]?.content?.parts[0]?.text ||
          "Sorry, I didn’t get that.";

        botResponse = rawText
          .replace(/\*\*(.*?)\*\*/g, "<b>$1</b>")
          .replace(/\*(.*?)\*/g, "<br/>$1");
      } catch (err) {
        botResponse = "⚠️ Error fetching response from Gemini.";
      }
    }

    // Add to chat
    setChatHistory((prev) => [
      ...prev,
      { type: "user", text: question },
      { type: "bot", text: botResponse },
    ]);

    setQuestion("");
    resetTranscript();
    setLoading(false);
  }

  // Enter key triggers send
  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      generateAnswer();
    }
  };

  // 🎙️ Speech Recognition Setup
  const {
    transcript,
    listening,
    resetTranscript,
    browserSupportsSpeechRecognition,
  } = useSpeechRecognition();

  // Update input as user speaks
  useEffect(() => {
    if (transcript) setQuestion(transcript);
  }, [transcript]);

  // Start mic
  const startListening = () => {
    resetTranscript();
    SpeechRecognition.startListening({ continuous: true, language: "en-IN" });
  };

  // Stop mic
  const stopListening = () => {
    SpeechRecognition.stopListening();
  };

  if (!browserSupportsSpeechRecognition) {
    return <p>Your browser does not support speech recognition.</p>;
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
              <p>
                <span>Hello Dev 👋</span>
              </p>
              <p>Ask me anything or just say hi!</p>
            </div>
          ) : (
            chatHistory.map((msg, i) => (
              <div key={i} className={`chat-bubble ${msg.type}`}>
                <img
                  src={
                    msg.type === "bot" ? assets.gemini_icon : assets.user_icon
                  }
                  alt=""
                />
                <p dangerouslySetInnerHTML={{ __html: msg.text }}></p>
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
            ⚠️ Gemini may display inaccurate information. Verify before use.
          </p>
        </div>
      </div>
    </div>
  );
}

export default Main;
