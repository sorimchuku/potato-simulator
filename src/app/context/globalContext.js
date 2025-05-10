'use client';

import { createContext, useContext, useState } from "react";

const GlobalContext = createContext();

export function GlobalContextProvider({ children }) {
  const [transcription, setTranscription] = useState("");
  const [situationData, setSituationData] = useState(null);

  return (
    <GlobalContext.Provider value={{ transcription, setTranscription, situationData, setSituationData }}>
      {children}
    </GlobalContext.Provider>
  );
}

export function useGlobalContext() {
  return useContext(GlobalContext);
}