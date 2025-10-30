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
    const [answer,  setAnswer] = useState("");
    const [loading, setLoading] = useState(false);
    const [chatHistory, setChatHistory] = useState([]);
    const [lastTopic, setLastTopic] = useState(""); // for "more" context
    const chatEndRef = useRef(null);


    // Auto-scroll to latest chat
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

    // 🎯 Generate Answer (Custom Q&A + Gemini fallback)
    async function generateAnswer() {
        if (!question.trim()) return;
        setLoading(true);
        SpeechRecognition.stopListening();

        let currentInput = question.toLowerCase();

        // 🧠 If user asks for "more" → refer to previous topic
        if (currentInput.includes("more") && lastTopic) {
            currentInput = `Give me more about: ${lastTopic}`;
        }

        const normalized = normalizeQuestion(currentInput);
        const fuse = new Fuse(customQA, { keys: ["question"], threshold: 0.2 });
        const customMatch = fuse.search(normalized);
        let botResponse = "";

        // ✅ Custom Q&A match
        if (customMatch.length > 0) {
            const top = customMatch[0];
            console.log("Top Answer: " + top);
            console.dir(top);
            botResponse = top.item.answer;
            // Save chat and stop here (no Gemini call)
            setChatHistory((prev) => [
                ...prev,
                { type: "user", text: question },
                { type: "bot", text: botResponse },
            ]);
            setLastTopic(question);
            setQuestion("");
            resetTranscript();
            setLoading(false);
            return;
        } else {
            // setAnswer("Loading...");
            setLoading(true);
            const response = await axios({
                url: "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=AIzaSyB6ZvDo3qUvuonroMCdWePm8ey8SchCkbk",
                method: "post",
                data: {
                    contents: [
                        { parts: [{ text: question }] },
                    ],
                },
            });

            // Converting the generated information into proper format for the end user
            let sameResponse = response.data.candidates[0].content.parts[0].text;
            let newSplitReponse = sameResponse.split("**");
            let finalResponse;
            for (let i = 0; i < newSplitReponse.length; i++) {
                if (i === 0 || i % 2 !== 1) {
                    finalResponse += newSplitReponse[i];
                } else {
                    finalResponse += "<b>" + newSplitReponse[i] + "</b>";
                }
            }
            finalResponse = finalResponse.replace(/^undefined/, "");
            let finalResponse2 = finalResponse.split("*").join("</br>")
            setAnswer(finalResponse2);

            // Displaying raw data
            // setAnswer(response.data.candidates[0].content.parts[0].text);

            setLoading(false);
        }

        // ✅ Gemini API fallback
        try {
            const response = await axios({
                url: "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=AIzaSyB6ZvDo3qUvuonroMCdWePm8ey8SchCkbk",
                method: "post",
                data: {
                    contents: [{ parts: [{ text: currentInput }] }],
                },
            });

            const rawText =
                response.data.candidates[0]?.content?.parts[0]?.text ||
                "Sorry, I didn’t get that.";

            botResponse = rawText
                .replace(/\*\*(.*?)\*\*/g, "<b>$1</b>")
                .replace(/\*(.*?)\*/g, "<i>$1</i>")
                .replace(/\n/g, "<br>");
        } catch (err) {
            botResponse = "⚠️ Error fetching response from Gemini.";
        }

        // ✅ Add Gemini answer to chat
        setChatHistory((prev) => [
            ...prev,
            { type: "user", text: question },
            { type: "bot", text: botResponse },
        ]);
        setLastTopic(question);
        setQuestion("");
        resetTranscript();
        setLoading(false);
    }

    // Pressing Enter sends question
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
        return <p>Your browser does not support speech recognition.</p>;
    }

    // 🧾 Format message text for lists, bold, italics
    function formatMessage(text) {
        if (!text) return "";

        let formatted = text
            .replace(/\*\*(.*?)\*\*/g, "<b>$1</b>")
            .replace(/\*(.*?)\*/g, "<i>$1</i>")
            .replace(/(^|\n)(\d+)\.\s+(.*?)(?=\n|$)/g, "$1<li>$2. $3</li>")
            .replace(/(^|\n)[•\-]\s+(.*?)(?=\n|$)/g, "$1<li>• $2</li>")
            .replace(/\n/g, "<br>");

        if (formatted.includes("<li>")) formatted = "<ul>" + formatted + "</ul>";

        return formatted;
    }

    // Dowload image
    function downloadDataUrl(dataUrl, filename = "generated-image.png") {
        const link = document.createElement("a");
        link.href = dataUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        link.remove();
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
                                <p dangerouslySetInnerHTML={{ __html: formatMessage(msg.text) }}></p>
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
