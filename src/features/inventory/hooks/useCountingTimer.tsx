import { useState, useEffect, useRef } from "react";

export interface TimerStats {
  totalTimeSpent: number;
  itemsCounted: number;
  itemsPerMinute: string;
}

export interface EditStats {
  editTimeSpent: number;
  itemsEdited: number;
}

export function useCountingTimer() {
  const [countingTime, setCountingTime] = useState(0);
  const [editTime, setEditTime] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [isEditTimerRunning, setIsEditTimerRunning] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const editIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Main counting timer
  useEffect(() => {
    if (isTimerRunning) {
      intervalRef.current = setInterval(() => {
        setCountingTime((prev) => prev + 1);
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isTimerRunning]);

  // Edit timer
  useEffect(() => {
    if (isEditTimerRunning) {
      editIntervalRef.current = setInterval(() => {
        setEditTime((prev) => prev + 1);
      }, 1000);
    } else {
      if (editIntervalRef.current) {
        clearInterval(editIntervalRef.current);
        editIntervalRef.current = null;
      }
    }

    return () => {
      if (editIntervalRef.current) {
        clearInterval(editIntervalRef.current);
      }
    };
  }, [isEditTimerRunning]);

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    }
    return `${minutes}:${secs.toString().padStart(2, "0")}`;
  };

  const startCountingTimer = () => setIsTimerRunning(true);
  const stopCountingTimer = () => setIsTimerRunning(false);
  const startEditTimer = () => setIsEditTimerRunning(true);
  const stopEditTimer = () => setIsEditTimerRunning(false);

  const generateTimerStats = (itemsCounted: number): TimerStats => {
    const itemsPerMinute =
      countingTime > 0
        ? (itemsCounted / (countingTime / 60)).toFixed(1)
        : "0.0";
    return {
      totalTimeSpent: countingTime,
      itemsCounted,
      itemsPerMinute,
    };
  };

  const generateEditStats = (itemsEdited: number): EditStats => {
    return {
      editTimeSpent: editTime,
      itemsEdited,
    };
  };

  return {
    countingTime,
    editTime,
    isTimerRunning,
    isEditTimerRunning,
    formatTime,
    startCountingTimer,
    stopCountingTimer,
    startEditTimer,
    stopEditTimer,
    generateTimerStats,
    generateEditStats,
  };
}
