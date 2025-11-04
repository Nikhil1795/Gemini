import React, { useState, useEffect, useRef } from "react";
import "./Main.css";
import Fuse from "fuse.js";
import synonyms from "../synonyms";
import customQA from "../customQA";
import colorGroups from "./colorGroups";
import axios from "axios";
import ColorChips from "./ColorChips"; // ⬅️ import component
import { assets } from "../../assets/assets";
import SpeechRecognition, { useSpeechRecognition } from "react-speech-recognition";

function Main() {
    const [question, setQuestion] = useState("");
    const [answer, setAnswer] = useState("");
    const [loading, setLoading] = useState(false);
    const [chatHistory, setChatHistory] = useState([]);
    const chatEndRef = useRef(null);

    const { transcript, listening, resetTranscript, browserSupportsSpeechRecognition } =
        useSpeechRecognition();

    useEffect(() => {
        if (transcript) setQuestion(transcript);
    }, [transcript]);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [chatHistory]);

    function normalizeQuestion(input) {
        return input
            .toLowerCase()
            .split(" ")
            .map((word) => synonyms[word] || word)
            .join(" ");
    }

    async function generateAnswer() {
        if (!question.trim()) return; 
        // if (!question.trim()) {
        //     setChatHistory(prev => [
        //         ...prev,
        //         { type: "user", text: question },
        //         { type: "bot", text: "Please ask some questions related to the Behr colors" },
        //     ]);
        //     return;
        // }
        setLoading(true);
        SpeechRecognition.stopListening();

        const normalized = normalizeQuestion(question);
        let botResponse = null;

        console.log("My Question: " + normalized);

        // 🎯 Try to find color in your JS
        const colorData = colorGroups[0]["color-groups"];
        console.log("My All Color Data: ", colorData);

        const matchedColorGroup = colorData.find((g) =>
            normalized.includes(g["color-group"].toLowerCase())
        );
        console.log("My Matched Color Data: ", matchedColorGroup);

        if (matchedColorGroup) {
            // ✅ Display component instead of HTML string
            setChatHistory((prev) => [
                ...prev,
                { type: "user", text: question },
                { type: "bot-component", component: <ColorChips matchedGroup={matchedColorGroup} /> },
            ]);
            setQuestion("");
            resetTranscript();
            setLoading(false);
            return;
        }

        // 🧠 Fallback: Custom QA or Gemini
        const fuse = new Fuse(customQA, { keys: ["question"], threshold: 0.3 });
        const customQuestionMatch = fuse.search(normalized);

        if (customQuestionMatch.length > 0) {
            console.log("customQuestionMatch: " + customQuestionMatch);
            botResponse = customQuestionMatch[0].item.answer;
        } else {
            try {
                const response = await axios.post(
                    "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=AIzaSyB6ZvDo3qUvuonroMCdWePm8ey8SchCkbk",
                    { contents: [{ parts: [{ text: question }] }] }
                );

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

        setChatHistory((prev) => [
            ...prev,
            { type: "user", text: question },
            { type: "bot", text: botResponse },
        ]);

        setAnswer(botResponse);
        setQuestion("");
        resetTranscript();
        setLoading(false);
    }

    const handleKeyPress = (e) => e.key === "Enter" && generateAnswer();

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
                                    src={msg.type === "bot" || msg.type === "bot-component" ? assets.gemini_icon : assets.user_icon}
                                    alt=""
                                />
                                {msg.type === "bot-component" ? (
                                    msg.component
                                ) : (
                                    <p dangerouslySetInnerHTML={{ __html: msg.text }}></p>
                                )}
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
                        <img
                            src={assets.mic_icon}
                            alt="mic"
                            onClick={() =>
                                listening
                                    ? SpeechRecognition.stopListening()
                                    : SpeechRecognition.startListening({ continuous: true })
                            }
                            style={{
                                filter: listening ? "drop-shadow(0 0 5px #4caf50)" : "none",
                                cursor: "pointer",
                            }}
                        />
                        <img
                            src={assets.send_icon}
                            alt="send"
                            onClick={generateAnswer}
                            style={{ cursor: "pointer" }}
                        />
                    </div>
                    {loading && <p className="loading">Thinking...</p>}
                </div>
            </div>
        </div>
    );
}

export default Main;
