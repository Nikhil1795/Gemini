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

    function clearSpeechInput() {
        SpeechRecognition.stopListening();
        setQuestion("");
        setTimeout(() => {
            resetTranscript();
        }, 1000);
        setLoading(false);
    }

    async function generateAnswer() {
        if (!question.trim()) return;
        setLoading(true);
        SpeechRecognition.stopListening();

        const normalized = normalizeQuestion(question);
        let botResponse = null;

        // ✅ STEP 1: Intent Detection
        function isConceptualQuestion(input) {
            const conceptualTriggers = ["how", "why", "what", "mix", "create", "make", "difference", "meaning"];
            const hasTrigger = conceptualTriggers.some(t => input.includes(t));
            const endsWithQuestion = input.trim().endsWith("?");
            return hasTrigger || endsWithQuestion || input.split(" ").length > 5;
        }

        // ✅ If conceptual/explanatory, go directly to Gemini
        if (isConceptualQuestion(normalized)) {
            try {
                const response = await axios.post(
                    "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=AIzaSyB6ZvDo3qUvuonroMCdWePm8ey8SchCkbk",
                    { contents: [{ parts: [{ text: question }] }] }
                );
                botResponse = response.data.candidates[0]?.content?.parts[0]?.text;
                botResponse = botResponse
                    .replace(/\*\*(.*?)\*\*/g, "<b>$1</b>")
                    .replace(/\*(.*?)\*/g, "<i>$1</i>")
                    .replace(/\n/g, "<br>");

                setChatHistory(prev => [
                    ...prev,
                    { type: "user", text: question },
                    { type: "bot", text: botResponse },
                ]);
                clearSpeechInput();
                return;
            } catch {
                botResponse = "⚠️ Error fetching explanation from Gemini API.";
            }
        }

        // ✅ STEP 2: Local color database logic
        const colorData = colorGroups[0]["color-groups"];
        const allColors = colorData.flatMap(group => group.colors);
        const normalizeCode = (str) => str.toLowerCase().replace(/[-\s]/g, "");
        const normalizedQuestion = normalized.replace(/[-\s]/g, "");

        // Exact match
        let matchedColorDetails = allColors.find(c => {
            const code = normalizeCode(c["color-code"]);
            const name = c["color-name"].toLowerCase();
            const hex = c["color-hex"].toLowerCase();
            return normalizedQuestion.includes(code) || normalized.includes(name) || normalized.includes(hex);
        });

        // Nearest HEX/RGB
        if (!matchedColorDetails) {
            let userInput = null;
            const hexMatch = normalizedQuestion.match(/#([0-9a-f]{3,6})/i);
            const rgbMatch = normalized.match(/rgb\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\)/i);

            if (hexMatch) userInput = hexMatch[0];
            else if (rgbMatch) userInput = rgbMatch[0];

            if (userInput) {
                const nearest = findNearestColor(userInput, allColors);
                if (nearest) matchedColorDetails = nearest;
            }
        }

        // Match by color group
        const matchedColorName = colorData.find(g => normalized.includes(g["color-group"].toLowerCase()));

        // Show color result
        if (matchedColorDetails) {
            setChatHistory(prev => [
                ...prev,
                { type: "user", text: question },
                { type: "bot-component", component: <ColorChips matchedGroup={{ colors: [matchedColorDetails] }} /> },
            ]);
            clearSpeechInput();
            return;
        }

        if (matchedColorName) {
            setChatHistory(prev => [
                ...prev,
                { type: "user", text: question },
                { type: "bot-component", component: <ColorChips matchedGroup={matchedColorName} /> },
            ]);
            clearSpeechInput();
            return;
        }

        // ✅ STEP 3: Fallback (Custom QA or Gemini)
        const fuse = new Fuse(customQA, { keys: ["question"], threshold: 0.3 });
        const customQuestionMatch = fuse.search(normalized);

        if (customQuestionMatch.length > 0) {
            botResponse = customQuestionMatch[0].item.answer;
        } else {
            try {
                const response = await axios.post(
                    "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=AIzaSyB6ZvDo3qUvuonroMCdWePm8ey8SchCkbk",
                    { contents: [{ parts: [{ text: question }] }] }
                );
                botResponse = response.data.candidates[0]?.content?.parts[0]?.text;
                botResponse = botResponse
                    .replace(/\*\*(.*?)\*\*/g, "<b>$1</b>")
                    .replace(/\*(.*?)\*/g, "<i>$1</i>")
                    .replace(/\n/g, "<br>");
            } catch {
                botResponse = "⚠️ Error fetching response from Gemini API.";
            }
        }

        setChatHistory(prev => [
            ...prev,
            { type: "user", text: question },
            { type: "bot", text: botResponse },
        ]);

        setAnswer(botResponse);
        clearSpeechInput();
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

                {/*HTML for Input Field */}
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
