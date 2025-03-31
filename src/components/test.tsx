"use client";

import { getTopPercentile } from "@/lib/utils";
import { useState, useEffect, useCallback, useRef } from "react";
import { RefreshCw, X } from "lucide-react"; // using lucide-react icons
import { submitScore } from "@/services/leaderBordServices";
import { CheckCircle, Trophy } from "lucide-react";

interface TypingTestProps {
  targetWpm: number;
  leaderBoardEntries: LeaderBoardEntries;
}
interface LeaderBoardEntries {
  entries: {
    rank: number;
    WPM: number;
    Name: string;
    Date: string;
  }[];
}

interface Results {
  userWpm: number;
  aiWpm: number;
  winner: "user" | "ai" | "tie";
  mistakes: number;
  accuracy: number;
}

const sampleText =
  "The quick brown fox jumps over the lazy dog. Programming is the art of telling another human what one wants the computer to do. Practice makes perfect when learning new skills.";

const cumulativeWidths: number[] = [0];
let currentWidth = 0;
for (let i = 0; i < sampleText.length; i++) {
  if (sampleText[i] === " ") {
    currentWidth += 6;
  } else {
    currentWidth += 24;
  }
  cumulativeWidths.push(currentWidth);
}

const words = sampleText.split(/\s+/);
const wordLengths = words.map((word) => word.length);
const totalWords = words.length;

export default function TypingTest({
  targetWpm = 67,
  leaderBoardEntries,
}: TypingTestProps) {
  const [userInput, setUserInput] = useState<string>("");
  const [showLeaderBoard, setShowLeaderBoard] = useState<boolean>(false);
  const [showNoPasteModal, setShowNoPasteModal] = useState<boolean>(false);
  const [status, setStatus] = useState<
    "waiting" | "countdown" | "racing" | "finished"
  >("waiting");
  const [countdown, setCountdown] = useState(3);
  const [userCursorPos, setUserCursorPos] = useState<number>(0);
  const [aiCursorPos, setAiCursorPos] = useState<number>(0);
  const [completedWords, setCompletedWords] = useState<number>(0);
  const [results, setResults] = useState<Results>();
  const [submissionName, setSubmissionName] = useState<string>("");
  const [hasSubmitted, setHasSubmitted] = useState<boolean>(false);
  const [showResultsModal, setShowResultsModal] = useState<boolean>(false);
  const [submissionLoading, setSubmissionLoading] = useState(false);
  const [submissionError, setSubmissionError] = useState("");
  const textContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const startTime = useRef<number>(0);
  const targetSpeed = useRef<number>(((60 / targetWpm) * 1000) / 5);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);

  const startRace = () => {
    setStatus("countdown");
    setCountdown(3);
    countdownRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev === 1) {
          clearInterval(countdownRef.current!);
          setStatus("racing");
          startTime.current = Date.now();
        }
        return prev - 1;
      });
    }, 1000);
  };

  const updateProgress = useCallback((input: string) => {
    const typedWords = input.trim().split(/\s+/);
    setCompletedWords(typedWords.length - 1);
  }, []);

  useEffect(() => {
    if (textContainerRef.current && status === "racing") {
      const currentWordElement = textContainerRef.current.querySelector(
        `[data-word-index="${completedWords}"]`
      );
      if (currentWordElement) {
        const containerWidth = textContainerRef.current.offsetWidth;
        const wordLeft = (currentWordElement as HTMLElement).offsetLeft;
        const wordWidth = (currentWordElement as HTMLElement).offsetWidth;
        const targetScroll = wordLeft - containerWidth / 2 + wordWidth / 2;
        textContainerRef.current.scrollTo({
          left: targetScroll,
          behavior: "smooth",
        });
      }
    }
  }, [completedWords, status]);

  const updateCursors = useCallback(() => {
    const elapsed = Date.now() - startTime.current;
    const targetChars = Math.floor(elapsed / targetSpeed.current);
    setAiCursorPos(Math.min(targetChars, sampleText.length));
    setUserCursorPos(userInput.length);

    if (
      userInput.length >= sampleText.length ||
      targetChars >= sampleText.length
    ) {
      const raceTime = (Date.now() - startTime.current) / 1000 / 60;
      const userWpm = Math.round(userInput.length / 5 / raceTime);
      const aiWpm = Math.round(targetWpm);

      // Calculate mistakes and accuracy based on user input
      const totalTyped = userInput.length;
      const mistakes =
        totalTyped > 0
          ? userInput.split("").filter((char, idx) => char !== sampleText[idx])
              .length
          : 0;
      const accuracy =
        totalTyped > 0
          ? Math.round(((totalTyped - mistakes) / totalTyped) * 100)
          : 100;

      setResults({
        userWpm,
        aiWpm,
        winner: userWpm > aiWpm ? "user" : aiWpm > userWpm ? "ai" : "tie",
        mistakes,
        accuracy,
      });
      setShowResultsModal(true);
      setStatus("finished");
      return false;
    }
    return true;
  }, [userInput.length, targetWpm]);

  useEffect(() => {
    if (status === "racing") {
      let animationFrameId: number;

      const frame = () => {
        const shouldContinue = updateCursors();
        if (shouldContinue) {
          animationFrameId = requestAnimationFrame(frame);
        }
      };

      animationFrameId = requestAnimationFrame(frame);

      return () => cancelAnimationFrame(animationFrameId);
    }
  }, [status, updateCursors]);

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (status !== "racing") return;
    const newValue = e.target.value.slice(0, sampleText.length);
    setUserInput(newValue);
    updateProgress(newValue);
  };

  const resetTest = () => {
    setUserInput("");
    setUserCursorPos(0);
    setAiCursorPos(0);
    setCompletedWords(0);
    setStatus("waiting");
    setResults(undefined);
    setSubmissionName("");
    setHasSubmitted(false);
    setShowResultsModal(false);
    clearInterval(countdownRef.current!);
    textContainerRef.current?.scrollTo(0, 0);
  };

  const getCursorPosition = (pos: number) => {
    if (!textContainerRef.current || cumulativeWidths.length === 0) return 0;
    const totalComputedWidth = cumulativeWidths[cumulativeWidths.length - 1];
    const actualTotalWidth = textContainerRef.current.scrollWidth;
    const scaleFactor = actualTotalWidth / totalComputedWidth;
    const scaledPosition =
      cumulativeWidths[Math.min(pos, sampleText.length)] * scaleFactor;
    return scaledPosition;
  };

  useEffect(() => {
    if (status === "racing") {
      inputRef.current?.focus();
    }
  }, [status]);

  const openLeaderBoard = () => {
    setShowLeaderBoard(true);
  };

  const handleSubmitResult = async () => {
    // Only process if submission requirements are met.
    if (
      results?.winner === "user" &&
      results?.accuracy === 100 &&
      submissionName.trim()
    ) {
      try {
        setSubmissionError("");
        setSubmissionLoading(true);
        await submitScore(submissionName, results.userWpm);
        console.log("Submitted Result:", {
          name: submissionName,
          WPM: results.userWpm,
        });
        setHasSubmitted(true);
      } catch (error) {
        console.error("Submission error:", error);
        setSubmissionError(
          "There was an error submitting your score. Please try again."
        );
      } finally {
        setSubmissionLoading(false);
      }
    }
  };

  return (
    <div className="w-[80vw] max-w-6xl mx-auto p-6 font-mono select-none">
      <div className="flex justify-between items-center mb-6 text-gray-400">
        <div className="text-lg">
          {status === "racing"
            ? `${completedWords}/${totalWords} words`
            : "Type racing game"}
        </div>
        <div className="flex gap-5">
          {(status === "countdown" || status === "racing" || status === 'finished') && (
            <button
              onClick={resetTest}
              className="text-sm text-gray-400 hover:text-yellow-500 transition-colors"
            >
              reset
            </button>
          )}
          <button
            onClick={openLeaderBoard}
            className="text-sm text-gray-400 hover:text-yellow-500 transition-colors"
          >
            leader
          </button>
        </div>
      </div>

      <div className="relative group" onClick={() => inputRef.current?.focus()}>
        <div
          ref={textContainerRef}
          className="text-2xl leading-relaxed overflow-x-auto whitespace-nowrap scrollbar-hide pb-4 relative h-32"
        >
          {words.map((word, wordIndex) => (
            <span
              key={wordIndex}
              className="word-group relative"
              data-word-index={wordIndex}
            >
              {word.split("").map((char, charIndex) => {
                const absoluteIndex =
                  wordLengths.slice(0, wordIndex).reduce((a, b) => a + b, 0) +
                  charIndex +
                  wordIndex;
                return (
                  <span
                    key={absoluteIndex}
                    className={`relative inline-block ${
                      absoluteIndex < userInput.length
                        ? userInput[absoluteIndex] === sampleText[absoluteIndex]
                          ? "correct"
                          : "incorrect"
                        : "untyped"
                    }`}
                  >
                    {char}
                  </span>
                );
              })}
            </span>
          ))}

          {/* Cursors positioned below text */}
          <div className="w-full left-0 top-full mt-2">
            <div
              className="absolute h-8 w-[2px] bottom-[92px] bg-gray-500/80 rounded-sm pointer-events-none transition-all duration-200 -translate-x-1/2"
              style={{ left: `${getCursorPosition(aiCursorPos)}px` }}
            />
            <div
              className="absolute h-8 w-[2px] bottom-[92px] bg-yellow-700 rounded-sm pointer-events-none transition-all duration-0 -translate-x-1/2"
              style={{ left: `${getCursorPosition(userCursorPos)}px` }}
            />
          </div>
        </div>

        {/* Overlay states */}
        {status === "waiting" && (
          <button
            onClick={startRace}
            className="z-50 absolute top-3/4 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-yellow-600 px-6 py-3 rounded-lg hover:bg-yellow-700 transition-colors"
          >
            Start Race
          </button>
        )}

        {status === "countdown" && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-6xl font-bold text-yellow-500">
            {countdown}
          </div>
        )}

        {showResultsModal && status === "finished" && results && (
          <div className="absolute top-[-80] left-1/2 z-[30] -translate-x-1/2 -translate-y-1/2 bg-[#1a1a1a] p-8 rounded-lg text-center max-w-md w-full shadow-lg">
            <h2 className="text-3xl font-bold mb-6">
              {results.winner === "user"
                ? "Congratulations, You Won! :3"
                : results.winner === "ai"
                ? "I Won! B)"
                : "Tie Game!"}
            </h2>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-yellow-600 rounded p-4">
                <div className="text-sm text-gray-200">Your Score</div>
                <div className="text-2xl font-semibold text-white">
                  {results.userWpm} <span className="text-xs">WPM</span>
                </div>
              </div>
              <div className="bg-gray-700 rounded p-4">
                <div className="text-sm text-gray-200">My High Score</div>
                <div className="text-2xl font-semibold text-white">
                  {results.aiWpm} <span className="text-xs">WPM</span>
                </div>
              </div>
            </div>
            <div className="mb-6 text-gray-300">
              <p>
                Mistakes:{" "}
                <span className="font-medium">{results.mistakes}</span>
              </p>
              <p>
                Accuracy:{" "}
                <span className="font-medium">{results.accuracy}%</span>
              </p>
              <p className="mt-2">
                Top {getTopPercentile(results.userWpm)}% percentile on
                MonkeyType.
              </p>
            </div>

            {/* Conditional submission form */}
            <div className="mb-6">
              <div className="flex items-center align flex-col justify-around gap-2">
                {/* Checkbox for 100% Accuracy */}
                <input
                  type="checkbox"
                  checked={results.accuracy === 100}
                  readOnly
                  className="hidden cursor-default"
                  id="accuracyCheckbox"
                />
                <label htmlFor="accuracyCheckbox" className="flex items-center">
                  <div
                    className={`w-5 h-5 border rounded ${
                      results.accuracy === 100 ? "bg-green-500" : "bg-gray-800"
                    }`}
                  ></div>
                  <span className="ml-2"> 100 %{""}</span>
                  {results.accuracy === 100 ? (
                    <CheckCircle className="ml-1 text-green-500" />
                  ) : (
                    <CheckCircle className="ml-1 text-gray-300" />
                  )}
                </label>

                {/* Checkbox for Winning */}
                <input
                  type="checkbox"
                  checked={results.winner === "user"}
                  readOnly
                  className="hidden cursor-default"
                  id="winnerCheckbox"
                />
                <label htmlFor="winnerCheckbox" className="flex items-center">
                  <div
                    className={`w-5 h-5 border rounded ${
                      results.winner === "user"
                        ? "bg-yellow-500"
                        : "bg-gray-800"
                    }`}
                  ></div>
                  <span className="ml-2">Winner</span>
                  {results.winner === "user" ? (
                    <Trophy className="ml-1 text-yellow-500" />
                  ) : (
                    <Trophy className="ml-1 text-gray-300" />
                  )}
                </label>
              </div>

              {/* Submission Section */}
              <div className="flex flex-col gap-2 mt-4">
                <input
                  type="text"
                  value={submissionName}
                  onChange={(e) => setSubmissionName(e.target.value)}
                  placeholder="name"
                  className={`w-full px-3 py-2 rounded focus:outline-none transition-colors ${
                    results.winner === "user" && results.accuracy === 100
                      ? "bg-gray-800 text-gray-200 placeholder-gray-500"
                      : "bg-gray-500 text-gray-400 placeholder-gray-400 cursor-not-allowed"
                  }`}
                  disabled={
                    !(results.winner === "user" && results.accuracy === 100) ||
                    submissionLoading ||
                    hasSubmitted
                  }
                />

                {hasSubmitted ? (
                  <div className="w-full py-2 rounded transition-colors flex items-center justify-center bg-green-600 text-white">
                    Submitted
                  </div>
                ) : (
                  <button
                    onClick={handleSubmitResult}
                    disabled={
                      !(
                        results.winner === "user" && results.accuracy === 100
                      ) ||
                      !submissionName.trim() ||
                      submissionLoading
                    }
                    className={`w-full py-2 rounded transition-colors flex items-center justify-center ${
                      results.winner === "user" &&
                      results.accuracy === 100 &&
                      submissionName.trim() &&
                      !submissionLoading
                        ? "bg-yellow-600 hover:bg-yellow-700"
                        : "bg-gray-500 cursor-not-allowed"
                    }`}
                  >
                    {submissionLoading ? "Submitting..." : "Submit"}
                  </button>
                )}

                {submissionError && (
                  <div className="mt-2 text-center text-sm text-red-400">
                    {submissionError}
                  </div>
                )}
                {!(results.winner === "user" && results.accuracy === 100) && (
                  <div className="mt-2 text-center text-sm text-gray-400">
                    To submit, you need to win the game with 100% accuracy.
                  </div>
                )}
              </div>
            </div>

            {/* Two main buttons at the bottom */}
            <div className="flex gap-4 justify-center">
              <button
                onClick={resetTest}
                className="flex items-center gap-2 bg-yellow-600 hover:bg-yellow-700 transition-colors py-2 px-4 rounded"
              >
                <RefreshCw size={20} /> 
              </button>
              <button
                onClick={() => setShowResultsModal(false)}
                className="flex items-center gap-2 bg-gray-600 hover:bg-gray-700 transition-colors py-2 px-4 rounded"
              >
                <X size={20} />
              </button>
            </div>
          </div>
        )}

        <textarea
          ref={inputRef}
          value={userInput}
          onChange={handleInput}
          onPaste={(e) => {
            e.preventDefault();
            setShowNoPasteModal(true);
          }}
          onKeyDown={(e) => e.key === "Escape" && resetTest()}
          className="absolute top-0 left-0 w-full h-full opacity-0 cursor-default"
          disabled={status !== "racing"}
          spellCheck={false}
        />
      </div>

      {/* Leaderboard Modal */}
      {showLeaderBoard && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-[#1a1a1a] p-6 rounded-lg w-80">
            <h2 className="text-2xl mb-4 text-center">Leaderboard</h2>
            <ul className="space-y-2">
              {leaderBoardEntries.entries
                .sort((a, b) => a.rank - b.rank)
                .map((entry) => (
                  <li
                    key={entry.rank}
                    className="flex justify-between text-gray-300"
                  >
                    <span>
                      {entry.rank}. {entry.Name}
                    </span>
                    <span>{entry.Date}</span>
                    <span className="text-yellow-500">{entry.WPM} WPM</span>
                  </li>
                ))}
            </ul>
            <button
              onClick={() => setShowLeaderBoard(false)}
              className="mt-4 block mx-auto text-sm text-yellow-500 hover:underline"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* No Paste Modal */}
      {showNoPasteModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-[#1a1a1a] p-6 rounded-lg w-80 text-center">
            <p className="text-xl">no :)</p>
            <button
              onClick={() => setShowNoPasteModal(false)}
              className="mt-4 text-sm text-yellow-500 hover:underline"
            >
              Close
            </button>
          </div>
        </div>
      )}

      <style jsx>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }

        .word-group {
          letter-spacing: 0em;
          margin-right: 0.25em;
        }

        .untyped {
          color: #4a4a4a;
        }

        .correct {
          color: #e5e7eb;
        }

        .incorrect {
          color: #ef4444;
        }
      `}</style>
    </div>
  );
}
