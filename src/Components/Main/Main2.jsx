// Inital simple Gemini: It just  give you google response

// import React, { useState } from 'react'
// import './Main.css';
// import customQA from '../../customQA';
// import axios from 'axios';
// import { assets } from '../../assets/assets';

// function Main() {
//     const [question, setQuestion] = useState("");
//     const [answer,  setAnswer] = useState("");
//     const [loading, setLoading] = useState(false);

    
//     async function generateAnswer() {
//         // setAnswer("Loading...");
//         setLoading(true);
//         const response = await axios({
//             url: "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=AIzaSyB6ZvDo3qUvuonroMCdWePm8ey8SchCkbk",
//             method: "post",
//             data: {
//                 contents: [
//                     { parts: [{ text: question }] },
//                 ],
//             },
//         });

//         // Converting the generated information into proper format for the end user
//         let sameResponse = response.data.candidates[0].content.parts[0].text;
//         let newSplitReponse = sameResponse.split("**");
//         let finalResponse;
//         for(let i=0; i < newSplitReponse.length; i++) {
//             if(i === 0 || i%2 !== 1) {
//               finalResponse +=  newSplitReponse[i]; 
//             } else {
//                 finalResponse +=  "<b>" +newSplitReponse[i]+ "</b>";
//             }
//         }
//         finalResponse = finalResponse.replace(/^undefined/, "");
//         let finalResponse2 = finalResponse.split("*").join("</br>");
//         setLoading(false);
//         setAnswer(finalResponse2);

//         // Displaying raw data
//         // setAnswer(response.data.candidates[0].content.parts[0].text);

//     }

//     const handleKeyPress = (e) => {
//         if(e.key === "Enter") {
//             e.preventDefault();
//             generateAnswer();
//         }
//     }

//     return (
//         <>
//             <div className='main'>
//                 <div className='nav'>
//                     <p>Gemini</p>
//                     <img src={assets.user_icon} />
//                 </div>
//                 <div className='main-container'>
//                     {!answer
//                     ? <>
//                         <div className='greet'>
//                         <p><span>Hello Dev</span></p>
//                         <p>How can I help you today?</p>
//                     </div>
//                     <div className='cards'>
//                         <div className='card'>
//                             <p>Suggest beautiful places to visits</p>
//                             <img src={assets.compass_icon} />
//                         </div>
//                         <div className='card'>
//                             <p>Summerise the concepts of urban places</p>
//                             <img src={assets.bulb_icon} />
//                         </div>
//                         <div className='card'>
//                             <p>Suggest beautiful places to visits</p>
//                             <img src={assets.message_icon} />
//                         </div>
//                         <div className='card'>
//                             <p>Suggest beautiful places to visits</p>
//                             <img src={assets.code_icon} />
//                         </div>
//                     </div>
//                     </>
//                     :<div className='result'>
//                         <div className="result-title">
//                             <img src={assets.user_icon} />
//                             <p>{question}</p>
//                         </div>
//                         <div className='result-data'>
//                             <img src={assets.gemini_icon} />
//                             {
//                                 loading
//                                 ?<div className='loader'>
//                                     <hr />
//                                     <hr />
//                                     <hr />
//                                 </div>
//                                 :
//                                 <p dangerouslySetInnerHTML={{__html:answer}}></p>
//                             }
                            
//                         </div>
//                     </div>
//                     }


//                     <div className='main-bottom'>
//                         <div className='search-box'>
//                             <input value={question} onChange={(e) => setQuestion(e.target.value)} onKeyDown={handleKeyPress} type='text' placeholder='Prompt here' />
//                             <div>
//                                 <img src={assets.gallery_icon} alt="" />
//                                 <img src={assets.mic_icon} alt="" />
//                                 <img onClick={generateAnswer} src={assets.send_icon} alt="" />
//                             </div>
//                         </div>
//                         <p className='bottom-info'>
//                             Google may display inacurate information. Please check your own information
//                         </p>
//                     </div>
//                 </div>
//             </div>
//         </>
//     )
// }

// export default Main



