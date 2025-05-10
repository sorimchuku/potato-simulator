'use client';

import { useState } from "react";
import { useGlobalContext } from "../context/globalContext";
import Image from "next/image";

export default function ResultPage() {
  const { transcription, situationData } = useGlobalContext();
  const [resultText, setResultText] = useState("");

  return (
    <div className="flex flex-col items-center justify-center h-screen">
      <div className="bg-image w-full h-1/3 bg-cover bg-center justify-self-start relative" >
        <div className="overlay absolute inset-0 bg-black opacity-50 h-full w-full">
        </div>
        <div className="text-overlay absolute inset-0 flex self-end py-2 bg-gray-300 opacity-70 justify-center text-white">한줄평</div>
        <Image
          src={situationData.imageUrl}
          alt="상황 이미지"
          width={500}
          height={500}
          className="object-cover w-full h-full"
        />
      </div>
      <div className="text-container w-full flex-grow bg-white p-4">
        <h1 className="text-4xl font-bold mb-4">결과 페이지</h1>
        <p className="text-lg">text: {transcription}</p>
      </div>
    </div>
  );
}