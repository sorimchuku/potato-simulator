import { SpeechClient } from "@google-cloud/speech";
import fs from "fs";
import path from "path";
import Ffmpeg from "fluent-ffmpeg";

export const config = {
  api: {
    bodyParser: false, // Next.js 기본 bodyParser 비활성화
  },
};

const speechClient = new SpeechClient({
  keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
});

export async function POST(req) {
  const keyFilePath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (!fs.existsSync(keyFilePath)) {
    console.error("Key file does not exist:", keyFilePath);
    return new Response(JSON.stringify({ error: "Key file not found" }), { status: 500 });
  }

  try {
    // 1. 파일 데이터를 저장할 임시 경로 생성
    const tempDir = path.join(process.cwd(), "temp");
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir);
    }
    const tempFilePath = path.join(tempDir, "uploaded-audio.webm");
    const flacFilePath = path.join(tempDir, "converted-audio.flac");

    // 2. Request의 body를 읽어서 파일로 저장
    const fileStream = fs.createWriteStream(tempFilePath);
    let totalBytes = 0;

    for await (const chunk of req.body) {
      fileStream.write(chunk);
      totalBytes += chunk.length;
    }

    console.log("Total bytes written:", totalBytes);

    // 스트림 종료 후 파일 크기 확인
    await new Promise((resolve, reject) => {
      fileStream.end(() => {
        console.log("File stream ended");
        resolve();
      });
    });

    if (!fs.existsSync(tempFilePath)) {
      throw new Error("Temp file was not created");
    }

    const fileSize = fs.statSync(tempFilePath).size;
    console.log("Audio file size:", fileSize);

    if (fileSize === 0) {
      throw new Error("Audio file is empty");
    }

    // // 3. FLAC 형식으로 변환
    // console.log("Converting audio to FLAC format...");
    // await new Promise((resolve, reject) => {
    //   Ffmpeg(tempFilePath)
    //     .output(flacFilePath)
    //     .audioFrequency(16000) // 샘플링 레이트 설정
    //     .audioChannels(1) // 모노 채널 설정
    //     .on("end", () => {
    //       console.log("Audio conversion to FLAC completed");
    //       resolve();
    //     })
    //     .on("error", (err) => {
    //       console.error("Error during audio conversion:", err);
    //       reject(err);
    //     })
    //     .run();
    // });

    // if (!fs.existsSync(flacFilePath)) {
    //   throw new Error("FLAC file was not created");
    // }

    // const flacFileSize = fs.statSync(flacFilePath).size;
    // console.log("FLAC file size:", flacFileSize);

    // if (flacFileSize === 0) {
    //   throw new Error("FLAC file is empty");
    // }

    // 3. Google Speech-to-Text API 호출
    const audio = fs.readFileSync(tempFilePath);
    const audioBytes = audio.toString("base64");

    if (!audioBytes) {
      throw new Error("Audio bytes are empty");
    }

    const request = {
      audio: {
        content: audioBytes,
      },
      config: {
        encoding: "WEBM_OPUS",
        sampleRateHertz: 48000,
        languageCode: "ko-KR", // 한국어 설정
      },
    };

    console.log("Speech-to-Text API request:", request);

    const [operation] = await speechClient.longRunningRecognize(request);
    const [response] = await operation.promise();
    const transcription = response.results
      .map((result) => result.alternatives[0].transcript)
      .join("\n");

    console.log("Transcription:", transcription);

    // 4. 임시 파일 삭제
    fs.unlinkSync(tempFilePath);
    // fs.unlinkSync(flacFilePath);

    return new Response(JSON.stringify({ text: transcription }), { status: 200 });
  } catch (error) {
    console.error("Error processing request:", error);
    return new Response(JSON.stringify({ error: "Failed to process request", details: error.message }), { status: 500 });
  }
}