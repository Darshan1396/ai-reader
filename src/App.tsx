import { useState, useEffect } from "react";
import * as pdfjsLib from "pdfjs-dist";
import "pdfjs-dist/build/pdf.worker.mjs";

pdfjsLib.GlobalWorkerOptions.workerSrc =
  `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

function App() {
  const [sentences, setSentences] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(-1);
  const [selectedVoice, setSelectedVoice] =
    useState<SpeechSynthesisVoice | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [rate, setRate] = useState(1);

  // Auto-select best voice
  useEffect(() => {
    const synth = window.speechSynthesis;

    const loadVoices = () => {
      const voices = synth.getVoices();

      const preferred =
        voices.find(v => v.name.includes("Google")) ||
        voices.find(v => v.name.includes("Microsoft")) ||
        voices[0];

      setSelectedVoice(preferred);
    };

    loadVoices();
    synth.onvoiceschanged = loadVoices;
  }, []);

  const handleFile = async (e: any) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = async function () {
      const typedarray = new Uint8Array(this.result as ArrayBuffer);
      const pdf = await pdfjsLib.getDocument(typedarray).promise;

      let fullText = "";

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        const strings = content.items.map((item: any) => item.str);
        fullText += strings.join(" ") + " ";
      }

      const splitSentences = fullText
        .replace(/\s+/g, " ")
        .split(/(?<=[.!?])\s+/)
        .filter((s) => s.trim() !== "");

      setSentences(splitSentences);
    };

    reader.readAsArrayBuffer(file);
  };

  const speak = () => {
    if (!sentences.length) return;

    const synth = window.speechSynthesis;
    synth.cancel();
    setIsPlaying(true);

    sentences.forEach((sentence, index) => {
      const utter = new SpeechSynthesisUtterance(sentence);

      if (selectedVoice) {
        utter.voice = selectedVoice;
      }

      utter.rate = rate;
      utter.pitch = 1;

      utter.onstart = () => {
        setCurrentIndex(index);
      };

      if (index === sentences.length - 1) {
        utter.onend = () => {
          setIsPlaying(false);
          setCurrentIndex(-1);
        };
      }

      synth.speak(utter);
    });
  };

  const pause = () => {
    window.speechSynthesis.pause();
  };

  const resume = () => {
    window.speechSynthesis.resume();
  };

  const stop = () => {
    window.speechSynthesis.cancel();
    setIsPlaying(false);
    setCurrentIndex(-1);
  };

  return (
    <div style={{ padding: "40px", maxWidth: "900px", margin: "auto" }}>
      <h1>AI Study Reader (PDF)</h1>

      <input type="file" accept=".pdf" onChange={handleFile} />

      <div style={{ marginTop: "15px" }}>
        <label>Speed: {rate}x </label>
        <input
          type="range"
          min="0.5"
          max="2"
          step="0.1"
          value={rate}
          onChange={(e) => setRate(Number(e.target.value))}
        />
      </div>

      <div style={{ marginTop: "20px" }}>
        <button onClick={speak} disabled={isPlaying}>
          Play
        </button>

        <button onClick={pause} style={{ marginLeft: "10px" }}>
          Pause
        </button>

        <button onClick={resume} style={{ marginLeft: "10px" }}>
          Resume
        </button>

        <button onClick={stop} style={{ marginLeft: "10px" }}>
          Stop
        </button>
      </div>

      <div style={{ marginTop: "30px" }}>
        {sentences.map((sentence, index) => (
          <p
            key={index}
            style={{
              background:
                currentIndex === index ? "#ffe066" : "transparent",
              padding: "5px",
              borderRadius: "4px"
            }}
          >
            {sentence}
          </p>
        ))}
      </div>
    </div>
  );
}

export default App;
