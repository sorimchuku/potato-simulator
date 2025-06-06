"use client"

import { useEffect } from "react";
import { signIn } from "../firebase";

export default function ClientInitializer() {
  useEffect(() => {
    const initializeFirebase = async () => {
      try {
        await signIn();
      } catch (error) {
        console.error("Error initializing Firebase:", error);
      }
    };

    initializeFirebase();
  }, []);

  return null;
}