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

  /* ---------------------- FORCE MALE ENGLISH VOICE ---------------------- */
  useEffect(() => {
    const synth = window.speechSynthesis;

    const loadVoices = () => {
      const voices = synth.getVoices();

      const maleVoice =
        voices.find(
          (v) =>
            v.lang === "en-US" &&
            (v.name.toLowerCase().includes("david") ||
              v.name.toLowerCase().includes("mark") ||
              v.name.toLowerCase().includes("john") ||
              v.name.toLowerCase().includes("male"))
        ) ||
        voices.find(
          (v) =>
            v.lang === "en-GB" &&
            (v.name.toLowerCase().includes("david") ||
              v.name.toLowerCase().includes("male"))
        );

      setSelectedVoice(maleVoice || voices[0]);
    };

    loadVoices();
    synth.onvoiceschanged = loadVoices;
  }, []);

  /* ---------------------- CLEAN PDF CONTENT ---------------------- */
  function cleanPDFText(rawText: string): string {
    const lines = rawText.split("\n");

    const filtered = lines.filter((line) => {
      const lower = line.toLowerCase().trim();

      // Remove unwanted header/footer patterns
      if (lower.includes("rv college")) return false;
      if (lower.includes("assistant professor")) return false;
      if (lower.includes("department of")) return false;
      if (lower.includes("prepared by")) return false;
      if (lower.includes("bengaluru")) return false;
      if (lower.includes("email")) return false;
      if (lower.includes("phone")) return false;
      if (lower.match(/^\d+$/)) return false; // page numbers only
      if (lower.length < 3) return false;

      return true;
    });

    return filtered.join(" ");
  }

  /* ---------------------- HANDLE PDF UPLOAD ---------------------- */
  const handleFile = async (e: any) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = async function () {
      const typedarray = new Uint8Array(this.result as ArrayBuffer);
      const pdf = await pdfjsLib.getDocument(typedarray).promise;

      let fullText = "";

      // 🔥 Skip first page automatically
      for (let i = 2; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        const strings = content.items.map((item: any) => item.str);
        fullText += strings.join(" ") + "\n";
      }

      const cleanedText = cleanPDFText(fullText);

      const splitSentences = cleanedText
        .replace(/\s+/g, " ")
        .split(/(?<=[.!?])\s+/)
        .filter((s) => s.trim() !== "");

      setSentences(splitSentences);
    };

    reader.readAsArrayBuffer(file);
  };

  /* ---------------------- SPEECH FUNCTION ---------------------- */
  const speak = () => {
    if (!sentences.length) return;

    const synth = window.speechSynthesis;
    synth.cancel();
    setIsPlaying(true);

    sentences.forEach((sentence, index) => {
      const utter = new SpeechSynthesisUtterance(sentence);

      if (selectedVoice) utter.voice = selectedVoice;

      utter.lang = "en-US";
      utter.rate = rate;
      utter.pitch = 0.9;

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

  const pause = () => window.speechSynthesis.pause();
  const resume = () => window.speechSynthesis.resume();
  const stop = () => {
    window.speechSynthesis.cancel();
    setIsPlaying(false);
    setCurrentIndex(-1);
  };

  /* ---------------------- UI ---------------------- */
  return (
    <div style={{ padding: "40px", maxWidth: "900px", margin: "auto" }}>
      <h1>AI Study Reader (Clean Mode)</h1>

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
                currentIndex === index ? "#a8f5a2" : "transparent",
              padding: "5px",
              borderRadius: "4px",
              lineHeight: "1.6",
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
