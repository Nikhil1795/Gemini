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
        if (transcript) {
            setQuestion(transcript);
        }
    }, [transcript]);


    // Auto - scroll
    // useEffect(() => {
    //     chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    // }, [chatHistory]);
    useEffect(() => {
        // Check if the bottom div exists
        if (chatEndRef.current) {
            chatEndRef.current.scrollIntoView({
                behavior: "smooth"
            });
        }
    }, [chatHistory]);


    // Normalise the input
    function normalizeQuestion(input) {
        return input
            .toLowerCase()
            .split(" ")
            .map((word) => synonyms[word] || word)
            .join(" ");
    }

    // Clear the input field 
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

        const normalized = normalizeQuestion(question.trim().toLowerCase());
        let botResponse = null;

        console.log("🧠 Normalized Question:", normalized);

        // 🎨 Access color data
        const colorGroupsData = colorGroups[0]["color-groups"];
        const colorGroupNames = colorGroupsData.map(g => g["color-group"].toLowerCase());

        // 🎯 Intent words
        const colorIntentWords = ["show", "display", "find", "shade", "tone", "chip", "palette"];
        const creativeIntentWords = ["make", "mix", "create", "combine", "why", "how", "formula", "car", "flower"];

        const hasColorIntent = colorIntentWords.some(word => normalized.includes(word));
        const hasCreativeIntent = creativeIntentWords.some(word => normalized.includes(word));

        // 🧠 1️⃣ Match color group name (like "red")
        const foundGroup = colorGroupNames.find(group =>
            normalized.includes(group) ||
            normalized.includes(`${group} color`) ||
            normalized.includes(`color ${group}`)
        );

        // 🎨 2️⃣ Match hex color (#A04039 or a04039)
        const hexMatch = normalized.match(/#?([0-9a-f]{6})/i);
        if (hexMatch) {
            const inputHex = "#" + hexMatch[1].toUpperCase();

            // Helper: convert hex → RGB
            const hexToRgb = hex => {
                const bigint = parseInt(hex.slice(1), 16);
                return { r: (bigint >> 16) & 255, g: (bigint >> 8) & 255, b: bigint & 255 };
            };

            const rgbInput = hexToRgb(inputHex);

            // Helper: color difference (Euclidean)
            const colorDiff = (rgb1, rgb2) => {
                const diff = Math.sqrt(
                    Math.pow(rgb1.r - rgb2.r, 2) +
                    Math.pow(rgb1.g - rgb2.g, 2) +
                    Math.pow(rgb1.b - rgb2.b, 2)
                );
                return (diff / 441.67) * 100;
            };

            let nearestColor = null;
            let nearestGroup = null;
            let smallestDiff = 9999;

            colorGroupsData.forEach(group => {
                group.colors.forEach(color => {
                    const rgbColor = hexToRgb(color["color-hex"]);
                    const diff = colorDiff(rgbInput, rgbColor);
                    if (diff < smallestDiff) {
                        smallestDiff = diff;
                        nearestColor = color;
                        nearestGroup = group;
                    }
                });
            });

            if (nearestColor) {
                const singleChipGroup = {
                    "color-group": nearestGroup["color-group"],
                    colors: [nearestColor],
                };

                const similarity = (100 - smallestDiff).toFixed(2);

                setChatHistory(prev => [
                    ...prev,
                    { type: "user", text: question },
                    { type: "bot-component", component: <ColorChips matchedGroup={singleChipGroup} /> },
                    {
                        type: "bot",
                        text: `The closest Behr color to <b>${inputHex}</b> is <b>${nearestColor["color-name"]}</b> 
                    (${nearestColor["color-code"]}) from the <b>${nearestGroup["color-group"]}</b> group.<br>
                    Similarity: <b>${similarity}%</b>`
                    }
                ]);
                clearSpeechInput();
                return;
            }
        }

        // 🎯 3️⃣ Match color code like "PPU2-16", "ppu216", "PPU216"
        const codeMatch = normalized.match(/[a-z]{1,4}\d{1,3}-?\d{0,3}/i);
        if (codeMatch) {
            const inputCode = codeMatch[0].toUpperCase().replace("-", ""); // normalize dash-free

            let matchedColor = null;
            let matchedGroup = null;

            colorGroupsData.forEach(group => {
                group.colors.forEach(color => {
                    const normalizedCode = color["color-code"].toUpperCase().replace("-", "");
                    if (normalizedCode === inputCode) {
                        matchedColor = color;
                        matchedGroup = group;
                    }
                });
            });

            if (matchedColor && matchedGroup) {
                const singleChipGroup = {
                    "color-group": matchedGroup["color-group"],
                    colors: [matchedColor],
                };
                setChatHistory(prev => [
                    ...prev,
                    { type: "user", text: question },
                    { type: "bot-component", component: <ColorChips matchedGroup={singleChipGroup} /> }
                ]);
                clearSpeechInput();
                return;
            } else {
                setChatHistory(prev => [
                    ...prev,
                    { type: "user", text: question },
                    {
                        type: "bot",
                        text: `Sorry, I couldn’t find any Behr color with the code <b>${codeMatch[0]}</b>. 
                    Please check the color code or try a color name instead (e.g. “show red color”).`
                    }
                ]);
                clearSpeechInput();
                return;
            }
        }

        // 🎨 4️⃣ Match color group name (red, yellow, etc.)
        if (foundGroup && (!hasCreativeIntent || hasColorIntent)) {
            const matchedColorGroup = colorGroupsData.find(
                g => g["color-group"].toLowerCase() === foundGroup
            );

            setChatHistory(prev => [
                ...prev,
                { type: "user", text: question },
                { type: "bot-component", component: <ColorChips matchedGroup={matchedColorGroup} /> }
            ]);
            clearSpeechInput();
            return;
        }

        // 🤖 5️⃣ Fallback: Custom QA or Gemini
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

                botResponse =
                    response.data.candidates[0]?.content?.parts[0]?.text ||
                    "Sorry, I didn’t get that.";

                botResponse = botResponse
                    .replace(/\*\*(.*?)\*\*/g, "<b>$1</b>")
                    .replace(/\*(.*?)\*/g, "<i>$1</i>")
                    .replace(/\n/g, "<br>");
            } catch (err) {
                console.error("❌ Gemini API Error:", err);
                botResponse = "⚠️ Error fetching response from Gemini API.";
            }
        }

        // 💬 6️⃣ Add to chat
        setChatHistory(prev => [
            ...prev,
            { type: "user", text: question },
            { type: "bot", text: botResponse }
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
