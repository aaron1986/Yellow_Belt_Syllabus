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
        song_answers ( answer )
      `)
      .order("id");

    if (error) {
      console.error(error);
      setLoading(false);
      return;
    }

    const formatted = data.map(song => ({
      id: song.id,
      title: song.title,
      audio: song.audio_path,
      answers: song.song_answers.map(a => a.answer)
    }));

    setSongs(formatted);
    setLoading(false);
  }

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
  };

  const startListening = () => {
    if (answered || gameWon) return;

    resetTranscript();

    SpeechRecognition.startListening({
      continuous: false,
      language: "en-GB"
    });

    setTimeout(() => {
      SpeechRecognition.stopListening();
    }, 20000);
  };

  const handleVoiceGuess = () => {
    if (answered || gameWon) return;

    const spoken = transcript.toLowerCase();

    const correct = currentSong.answers.some(ans =>
      spoken.includes(ans.toLowerCase())
    );

    setAnswered(true);

    if (correct) {
      setScore(prev => {
        const newScore = prev + 1;

        if (newScore === 15) {
          setGameWon(true);
        }

        return newScore;
      });

      setResult("Correct Answer!");
    } else {
      setScore(0);
      setResult("Wrong Answer Reset!");
    }
  };

  useEffect(() => {
    if (!listening && transcript && !answered) {
      handleVoiceGuess();
    }
  }, [listening]);

  // if Browser unsupported!
  if (!browserSupportsSpeechRecognition) {
    return (
      <div className="app">
        <h2>
          Your browser does not support speech recognition.
        </h2>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="app">
        <h2>Loading techniques...</h2>
      </div>
    );
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
        <source
          src={currentSong.audio}
          type="audio/mpeg"
        />
      </audio>

      <div className="voice-status">
        {listening && <h2>Listening...</h2>}

        {!listening && !answered && (
          <h2>Speak now...</h2>
        )}

        {transcript && (
          <p>You said: {transcript}</p>
        )}
      </div>

      {result && <h2>{result}</h2>}

      {answered && !gameWon && (
        <button onClick={pickRandomSong}>
          Next Technique
        </button>
      )}
    </div>
  );
}

export default App;
