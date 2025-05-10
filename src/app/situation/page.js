'use client';

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useGlobalContext } from "../context/globalContext";
import { situation_data } from "../data/situationData";

export default function SituationPage() {
  const { setTranscription, situationData, setSituationData } = useGlobalContext();
  const [responseType, setResponseType] = useState("voice"); // "voice" or "text"
  const [isLoading, setIsLoading] = useState(true);
  const [counter, setCounter] = useState(5);
  const [isCounterStarted, setIsCounterStarted] = useState(false);
  const [isStarted, setIsStarted] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [audioBlob, setAudioBlob] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [responseText, setResponseText] = useState("");
  const [textCountRemaining, setTextCountRemaining] = useState(0);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const audioContextRef = useRef(null);
  const barsRef = useRef([]);
  const router = useRouter();

  const startRecording = () => {
    navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
      const mimeType = "audio/webm;codecs=opus"; // "audio/webm" or "audio/wav" or "audio/mp4"
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        console.error(`${mimeType} is not supported in this browser.`);
        return;
      }

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;

      const audioContext = new window.AudioContext;
      audioContextRef.current = audioContext;
      const analyser = audioContext.createAnalyser();
      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);

      analyser.fftSize = 256;
      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const animate = () => {
        analyser.getByteFrequencyData(dataArray);

        // 파형 높이 업데이트
        barsRef.current.forEach((bar, index) => {
          if (bar) {
            const value = dataArray[index] || 0;
            bar.style.height = `${10 + (value / 255) * 40}px`; // 최소 높이 10px, 최대 높이 50px
          }
        });

        requestAnimationFrame(animate);
      };

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          console.log("Data chunk size:", event.data.size);
          audioChunksRef.current.push(event.data);
        } else {
          console.error("No data available from MediaRecorder.");
        }
      };

      mediaRecorder.onstop = () => {
        if (audioChunksRef.current.length === 0) {
          console.error("No audio chunks available.");
          return;
        }

        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        console.log("Audio Blob size:", audioBlob.size);
        setAudioBlob(audioBlob);
        audioChunksRef.current = []; // Clear chunks
      };

      mediaRecorder.start();
      setIsRecording(true);
      animate();
    });
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }

    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    if (mediaRecorderRef.current?.stream) {
      mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
    }

    barsRef.current.forEach((bar) => {
      if (bar) {
        bar.style.height = "10px"; // Reset height
      }
    });

  };

  const textSubmit = () => {
    //2초 후에 텍스트 전송
    setTimeout(() => {
      console.log("Text submitted:", responseText);
      const text = responseText.trim();
      setTranscription(text);

      router.push("/result");
      setResponseText("");

    }, 2000);
  }

  const skipSituation = () => {
    setIsLoading(true);
    const currentIndex = situationData.id - 1;
    let randomIndex = Math.floor(Math.random() * situation_data.length);
    while (randomIndex === currentIndex) {
      randomIndex = Math.floor(Math.random() * situation_data.length);
    }
    setSituationData(situation_data[randomIndex]);
    setIsStarted(false);
    setIsCounterStarted(false);
    setCounter(5);
    setResponseText("");
    setAudioBlob(null);
    setTranscription("");
    setTextCountRemaining(0);
    setTimeRemaining(0);
    setIsRecording(false);
  }

  useEffect(() => {
    if (audioBlob) {
      console.log("Audio Blob:", audioBlob);
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      audio.onloadedmetadata = () => {
        console.log("Audio duration:", audio.duration);
      };
      const formData = new FormData();
      formData.append("audio", audioBlob);

      console.log("Form Data:", formData.get("audio"));
      for (let pair of formData.entries()) {
        console.log(`${pair[0]}: ${pair[1]}`);
      }

      fetch("/api/transcribe", {
        method: "POST",
        body: audioBlob,
        headers: {
          "Content-Type": "application/octet-stream",
        },
      })
        .then((response) => {
          console.log("Response:", response.status);
          if (!response.ok) {
            // throw new Error("Network response was not ok");
            console.error("Error with response:", response.statusText);
          }
          return response.json();
        })
        .then((data) => {
          console.log("Transcription:", data.text);
          setTranscription(data.text);
          router.push("/result");
        })
        .catch((error) => {
          console.error("Error:", error);
        });
    }
  }, [audioBlob]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const responseTypeParam = params.get("responseType");
    if (responseTypeParam) {
      setResponseType(responseTypeParam);
    }

    if (!isLoading) {

    const startCounterTimer = setTimeout(() => {
      setIsCounterStarted(true);
      setCounter(5);
      const counterInterval = setInterval(() => {
        setCounter((prev) => {
          if (prev > 0) {
            return prev - 1;
          } else {
            clearInterval(counterInterval);
            setIsStarted(true);
            return 0;
          }
        });
      }, 1000);
    }, 3000);

    return () => {
      clearTimeout(startCounterTimer);
      setIsCounterStarted(false);
    };

    }

  }, [isLoading]);

  useEffect(() => {
    if (situationData) {
      setIsLoading(false);
    }
  }, [situationData]);

  useEffect(() => {
    if (isStarted && responseType === "voice") {
      startRecording();
    }
  }, [isStarted, responseType]);

  useEffect(() => {
    if (situationData?.time >= 0 && isStarted && responseType === "voice") {
      setTimeRemaining(situationData?.time);
    }

    const timer = setInterval(() => {
      if (isStarted) {
        setTimeRemaining((prev) => {
          if (prev > 0) {
            return prev - 1;
          } else {
            clearInterval(timer);
              stopRecording();
            return 0;
          }
        });
      }
    }, 1000);

    return () => {
      clearInterval(timer);
      stopRecording();
      setTimeRemaining(0);
    }

  }, [situationData?.time, isStarted, responseType]);

  useEffect(() => {
    if (isStarted) {
      setTextCountRemaining(situationData?.textCount);
    }
  }, [isStarted, situationData?.textCount]);


  const situationIntro = (
    <>
      <div className="text-container flex flex-col items-center justify-center bg-white rounded-t-md animate-text-slide-up relative">
        <div className="text-content w-full opacity-0 flex flex-col items-center h-full p-4 animate-text-content">
          <h1 className="text-xl font-bold">{situationData?.title}</h1>
          <div className="bubble-container flex flex-col w-full items-center gap-6 justify-center mt-4">

            <div className="bubble-left self-start bg-gray-300 px-8 py-2 rounded-full rounded-tl-none shadow-md max-w-xs opacity-0 translate-y-4 animate-bubble-left">
              <span>{situationData?.description}</span>
            </div>

            <div className="bubble-right self-end bg-blue-300 px-8 py-4 rounded-full rounded-tr-none shadow-md max-w-xs ml-2 opacity-0 translate-y-4 animate-bubble-right">
              <div className="dots flex items-center justify-center">
                <div className="dot bg-blue-500 w-2 h-2 rounded-full mr-1"></div>
                <div className="dot bg-blue-500 w-2 h-2 rounded-full mr-1"></div>
                <div className="dot bg-blue-500 w-2 h-2 rounded-full"></div>
              </div>
            </div>
          </div>


          {isCounterStarted && (
            <div className={`counter-overlay fixed inset-0 bg-black z-10 opacity-50 flex-1/3`}>
              <div className="top-half flex justify-center items-center absolute h-1/2 w-full top-0">
                <div className="counter text-white text-6xl font-bold animate-fade-in">
                  {counter > 0 ? counter : "시작!"}
                </div>
              </div>
            </div>
          )}



          <div className="button-container justify-self-end mt-auto flex flex-col items-center justify-center w-full relative">
            <span className="text-xl text-gray-400 font-bold absolute">5초 뒤 답변 시작...</span>
            <div className="animate-start-button cursor-pointer bg-black text-white rounded-lg capitalize font-bold text-xl flex items-center justify-center py-3 w-full opacity-0 z-50" onClick={() => {
              setIsStarted(true); setIsCounterStarted(false);
            }}>
              <span>바로 시작</span>
            </div>
          </div>
        </div>
      </div>
    </>

  )

  const voiceResponse = (
    <div className="voice-container w-full flex flex-col grow items-center justify-between">
      <div className="time-remaining flex justify-between items-center w-full">
        <span >남은 답변 시간</span>
        <div className="time-remaining-text flex items-center gap-2">
          <Image src={"/icon/clock.svg"} alt="clock" width={20} height={20} className="w-5 h-5" />
          <span className="text-xl font-bold">{timeRemaining}초</span>
        </div>
      </div>
      <div className="speaker flex justify-center items-center p-4 mt-4 w-full grow relative">
        <div className="wave absolute w-24 h-24 rounded-full bg-gray-200"></div>
        <div className="wave absolute w-24 h-24 rounded-full bg-gray-200"></div>
        <div className="absolute w-24 h-24 rounded-full bg-gray-300"></div>
        {/* <span className="text-black font-bold">🎤</span> */}

        <div className="waveform flex items-center gap-1 absolute">
          {[...Array(6)].map((_, index) => (
            <div key={index}
              ref={(el) => (barsRef.current[index] = el)}
              className="bar bg-gray-500 w-1 rounded-2xl"></div>
          ))}
        </div>
      </div>

      <div className="submit-button flex justify-center items-center bg-black text-white rounded-lg capitalize font-bold text-xl py-3 w-full"
        onClick={() => {
          stopRecording();
        }}
      >
        <span>답변 완료!</span>
      </div>
    </div>

  )

  const textResponse = (
    <div className="text-container w-full flex flex-col grow items-center justify-start gap-2">
      <div className="time-remaining flex justify-between items-center w-full">
        <span >남은 글자수</span>
        <div className="time-remaining-text flex items-center gap-2">
          <Image src={"/icon/clock.svg"} alt="clock" width={20} height={20} className="w-5 h-5" />
          <span className="text-xl font-bold">{textCountRemaining}</span>
        </div>
      </div>
      <div className="text-input-container flex items-center justify-between w-full mt-4 gap-2">
        <textarea
          className="text-input w-full h-full p-4 bg-gray-100 rounded-lg resize-none outline-none"
          value={responseText}
          placeholder="답변을 입력하세요..."
          rows={5}
          onChange={(e) => {
            setTextCountRemaining(situationData?.textCount - e.target.value.length);
            if (e.target.value.length > situationData?.textCount) {
              setResponseText(e.target.value.slice(0, situationData?.textCount));
            } else {
              setResponseText(e.target.value);
            }
          }}
          maxLength={situationData?.textCount}
        ></textarea>
        <div className="submit-button"
          onClick={textSubmit}
        >
          <Image src={"/icon/btn_send_chat.svg"} alt="send" width={36} height={36} className="" />
        </div>
      </div>

    </div>
  )


  return (
    <div className="situation-page flex flex-col h-screen">

      <div className="cancel-button flex justify-center items-center self-start w-10 h-10 absolute top-4 left-4 z-20 mix-blend-difference"
        onClick={() => router.push("/")}>
        <Image src={"/icon/cancel_white.svg"} alt="cancel" width={48} height={48} />
      </div>


      <div
      onClick={skipSituation}
      className="skip-button flex justify-center items-center absolute top-4 right-4 py-2 px-4 z-20 bg-black rounded-full cursor-pointer">
        <span className="text-white text-sm">이 상황 패스</span>
      </div>

      {isStarted && (
        <div className="situation-bubble-container flex flex-col w-full h-1/2 absolute top-0 left-0 p-4">
          <div className="situation-bubble flex flex-col self-start items-start justify-center justify-self-end mt-auto gap-1">
            <span className="text-white">{situationData?.name}</span>
            <div className="bubble-left bg-gray-300 px-8 py-2 rounded-full rounded-tl-none shadow-md max-w-xs opacity-70 z-50 ">
              <span>{situationData?.description}</span>
            </div>
          </div>
        </div>
      )}

      <div className="bg-image w-full h-full bg-cover bg-center animate-bg-shrink -z-10">
        <Image
          src={situationData?.imageUrl}
          alt="situation"
          width={500}
          height={500}
          className="w-full h-full object-cover"
        />
      </div>

      {isStarted ? (
        <div className="text-container flex flex-col h-1/2 items-center justify-between bg-white rounded-t-md p-4 px-8">
          
          {responseType === "voice" ? voiceResponse : textResponse}
        </div>
      ) : situationIntro}




    </div>
  );
}