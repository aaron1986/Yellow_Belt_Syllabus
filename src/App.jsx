import "./App.css";
import { useState, useEffect } from "react";
import { supabase } from "./lib/supabaseClient";
import SpeechRecognition, {
  useSpeechRecognition
} from "react-speech-recognition";

function App() {
  const [songs, setSongs] = useState([]);
  const [currentSong, setCurrentSong] = useState(null);
  const [answered, setAnswered] = useState(false);
  const [result, setResult] = useState(null);
  const [score, setScore] = useState(0);
  const [gameWon, setGameWon] = useState(false);
  const [loading, setLoading] = useState(true);

  const {
    transcript,
    listening,
    resetTranscript,
    browserSupportsSpeechRecognition
  } = useSpeechRecognition();

  // -----------------------------
  // Fetch from Supabase
  // -----------------------------
  useEffect(() => {
    fetchSongs();
  }, []);

  async function fetchSongs() {
    setLoading(true);

    const { data, error } = await supabase
      .from("songs")
      .select(`
        id,
        title,
        audio_path,
        song_answers ( answer, is_correct )
      `);

    if (error) {
      console.error(error);
      setLoading(false);
      return;
    }

    const formatted = data.map(song => ({
      id: song.id,
      title: song.title,
      audio: song.audio_path,
      correctAnswer:
        song.song_answers.find(a => a.is_correct)?.answer
    }));

    setSongs(formatted);
    setLoading(false);
  }

  // -----------------------------
  // Pick random song
  // -----------------------------
  useEffect(() => {
    if (songs.length > 0) {
      pickRandomSong();
    }
  }, [songs]);

  const pickRandomSong = () => {
    let randomSong;

    do {
      randomSong =
        songs[Math.floor(Math.random() * songs.length)];
    } while (randomSong?.id === currentSong?.id);

    setCurrentSong(randomSong);
    setAnswered(false);
    setResult(null);
    resetTranscript();
    SpeechRecognition.stopListening();
  };

  // -----------------------------
  // Start Listening
  // -----------------------------
  const startListening = () => {
    if (answered || gameWon) return;

    resetTranscript();

    SpeechRecognition.startListening({
      continuous: false,
      language: "en-GB"
    });

    setTimeout(() => {
      SpeechRecognition.stopListening();
    }, 8000);
  };

  // -----------------------------
  // Check Answer
  // -----------------------------
  const handleVoiceGuess = () => {
    if (!currentSong || answered || gameWon) return;

    const spoken = transcript.toLowerCase().trim();

    const correct =
      spoken.includes(
        currentSong.correctAnswer?.toLowerCase()
      );

    setAnswered(true);
    SpeechRecognition.stopListening();

    if (correct) {
      setScore(prev => {
        const newScore = prev + 1;
        if (newScore === 15) setGameWon(true);
        return newScore;
      });
      setResult("Correct Answer!");
    } else {
      setScore(0);
      setResult("Wrong Answer - Streak Reset!");
    }
  };

  // Auto check when listening stops
  useEffect(() => {
    if (!listening && transcript && !answered) {
      handleVoiceGuess();
    }
  }, [listening]);

  // -----------------------------
  // UI States
  // -----------------------------
  if (!browserSupportsSpeechRecognition) {
    return <h2>Speech recognition not supported.</h2>;
  }

  if (loading) {
    return <h2>Loading techniques...</h2>;
  }

  if (gameWon) {
    return (
      <div className="app">
        <h1>YOU WIN!</h1>
        <h2>15 techniques in a row!</h2>
        <button
          onClick={() => {
            setScore(0);
            setGameWon(false);
            pickRandomSong();
          }}
        >
          Play Again
        </button>
      </div>
    );
  }

  if (!currentSong) return null;

  return (
    <div className="app">
      <h1>Guess the Judo Technique</h1>
      <h2>Streak: {score} / 15</h2>

      <audio
        key={currentSong.audio}
        controls
        autoPlay
        onEnded={startListening}
      >
        <source src={currentSong.audio} type="audio/mpeg" />
      </audio>

      {listening && <h2>🎤 Listening...</h2>}
      {transcript && <p>You said: {transcript}</p>}
      {result && <h2>{result}</h2>}

      {answered && result.includes("Wrong") && (
        <p>Correct Answer: {currentSong.correctAnswer}</p>
      )}

      {answered && !gameWon && (
        <button onClick={pickRandomSong}>
          Next Technique
        </button>
      )}
    </div>
  );
}

export default App;