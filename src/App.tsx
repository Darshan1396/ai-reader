import { useState } from "react";
import * as pdfjsLib from "pdfjs-dist";
import pdfWorker from "pdfjs-dist/build/pdf.worker.mjs?url";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

function App() {
  const [text, setText] = useState("");
  const [currentLine, setCurrentLine] = useState<number | null>(null);

  const cleanText = (rawText: string) => {
    let lines = rawText.split("\n");

    lines = lines.filter((line) => {
      const trimmed = line.trim();

      if (!trimmed) return false;

      // Remove page numbers
      if (/^page\s*\d+/i.test(trimmed)) return false;
      if (/^\d+$/.test(trimmed)) return false;

      // Remove emails
      if (trimmed.includes("@")) return false;

      // Remove ALL CAPS lines (college names)
      if (
        trimmed === trimmed.toUpperCase() &&
        trimmed.length > 5 &&
        trimmed.length < 120
      )
        return false;

      // Remove very short lines
      if (trimmed.length < 20) return false;

      // Remove header keywords
      if (
        trimmed.toLowerCase().includes("department") ||
        trimmed.toLowerCase().includes("university") ||
        trimmed.toLowerCase().includes("college") ||
        trimmed.toLowerCase().includes("professor") ||
        trimmed.toLowerCase().includes("subject code")
      )
        return false;

      return true;
    });

    return lines.join("\n");
  };

  const handleFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = async function () {
      const typedArray = new Uint8Array(this.result as ArrayBuffer);
      const pdf = await pdfjsLib.getDocument(typedArray).promise;

      let extractedText = "";

      // Skip first page
      for (let i = 2; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();

        const pageText = content.items
          .map((item: any) => item.str)
          .join(" ");

        extractedText += pageText + "\n";
      }

      const finalText = cleanText(extractedText);
      setText(finalText);
    };

    reader.readAsArrayBuffer(file);
  };

  const speakText = () => {
    if (!text) return;

    const utterance = new SpeechSynthesisUtterance(text);

    const voices = window.speechSynthesis.getVoices();
    const maleVoice =
      voices.find((v) =>
        v.name.toLowerCase().includes("david")
      ) || voices.find((v) => v.lang === "en-US");

    if (maleVoice) utterance.voice = maleVoice;

    utterance.rate = 0.95;
    utterance.pitch = 0.85;

    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  };

  return (
    <div style={{ padding: "30px", fontFamily: "Arial" }}>
      <h2>Clean Academic PDF Reader</h2>

      <input type="file" accept="application/pdf" onChange={handleFile} />
      <br /><br />

      <button onClick={speakText}>Read Content</button>

      <pre style={{
        marginTop: "20px",
        whiteSpace: "pre-wrap",
        lineHeight: "1.6",
        background: "#f5f5f5",
        padding: "15px",
        borderRadius: "10px"
      }}>
        {text}
      </pre>
    </div>
  );
}

export default App;
