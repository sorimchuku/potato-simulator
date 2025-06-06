"use client";

import Image from "next/image";
import { situation_data } from "../data/situationData";
import { level_data } from "../data/levelData";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getUserId, getUserRecords } from "../firebase";

function ProgressBar({ exp, level }) {
  const progress = ((exp / level_data[level - 1].exp) * 100).toFixed(2);
  if (progress > 100) {
    return null; // 경험치가 최대 레벨을 초과하는 경우 ProgressBar를 렌더링하지 않음
  }
  return (
    <div className="container flex-col w-full">
      <div className="text-sm text-gray-400 mb-2 text-right mx-1 capitalize">
        XP {exp} / {level_data[level - 1].exp}
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className="bg-gray-500 h-2 rounded-l-full"
          style={{ width: `${progress}%` }}
        ></div>
      </div>
    </div>
  );
}

export default function RecordPage() {
  const router = useRouter();
  const [userData, setUserData] = useState({});
  const [userLevel, setUserLevel] = useState(1);

  useEffect(() => {
    const getUserData = async () => {
      const userId = await getUserId();
      if (userId) {
        const data = await getUserRecords(userId);
        console.log("userData", data);
        setUserData({
          id: userId,
          records: data.records,
          exp: data.userExp || 0, // 기본값 설정
        });
        // 레벨 계산
        const userExp = data.userExp || 0; // 기본값 설정
        const level = level_data.find((level) => userExp < level.exp);
        setUserLevel(level ? level.level : level_data.length); // 레벨이 없으면 최대 레벨로 설정
      } else {
        console.error("사용자 ID를 가져오는 데 실패했습니다.");
        setUserData({ records: [], exp: 0 });
      }
    }
    getUserData();
  }
  , []);

  const noData = (
    <div className="flex flex-col items-center justify-center w-full h-full">
      <div className="flex flex-1/3 items-center justify-center w-full">
        <ProgressBar progress={0} />
      </div>
      <div className="flex flex-2/3 text-gray-500 items-center justify-center w-full">
        <p className="text-lg">답변 기록을 쌓아보세요!</p>
      </div>
    </div>
  );

  const recordList = (
    <div className="flex flex-col items-center justify-center w-full h-full">
      <div className="flex flex-col flex-1/3 items-center justify-center w-full">
        <div className="level flex items-center justify-center gap-2">
          <div className="level-value text-sm text-gray-500 bg-gray-200 rounded px-1">레벨{userLevel}</div>
          <div className="level-name font-bold text-lg">{level_data[userLevel - 1].name}</div>
        </div>
        <ProgressBar exp={userData.exp} level={userLevel} />
      </div>
      <div className="flex flex-col flex-2/3 items-center w-full gap-2">
        {userData?.records?.map((record, index) => (
          <div key={index} className="record-item flex bg-gray-100 rounded-lg p-5 w-full items-center justify-center cursor-pointer"
            onClick={() => router.push(`/record/${record}`)}>
            <div className="title line-clamp-1 overflow-ellipsis px-2">{
              situation_data[record - 1].title
            }</div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="flex flex-col items-center justify-center h-screen">
      <div className="w-full flex justify-between items-center p-4 mt-4 justify-self-start mb-auto">
        <div className="cancel-button flex justify-center items-center absolute w-10 h-10 cursor-pointer" onClick={() => router.back()}>
          <Image src={"/icon/left_dark.svg"} alt="cancel" width={48} height={48} />
        </div>
        <h1 className="text-xl font-bold self-center mx-auto">나의 기록</h1>
      </div>

      <div className="container w-full flex-grow bg-white p-4">
        {recordList}
      </div>
    </div>
  );
}
