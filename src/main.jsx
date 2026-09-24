import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function App() {
  const [running, setRunning] = useState(false);
  const [gain, setGain] = useState(6);
  const [gate, setGate] = useState(-48);
  const [compressor, setCompressor] = useState(true);
  const [noise, setNoise] = useState(true);
  const [level, setLevel] = useState(0);
  const [message, setMessage] = useState("Mic đang tắt");

  const streamRef = useRef(null);
  const ctxRef = useRef(null);
  const sourceRef = useRef(null);
  const gainRef = useRef(null);
  const gateRef = useRef(null);
  const compressorRef = useRef(null);
  const analyserRef = useRef(null);
  const rafRef = useRef(null);

  useEffect(() => {
    return () => stopMic();
  }, []);

  useEffect(() => {
    if (gainRef.current) gainRef.current.gain.value = Math.pow(10, gain / 20);
    if (gateRef.current) gateRef.current.threshold.value = gate;
    if (compressorRef.current) compressorRef.current.threshold.value = compressor ? -18 : 0;
  }, [gain, gate, compressor]);

  function startMeter() {
    const analyser = analyserRef.current;
    if (!analyser) return;
    const data = new Uint8Array(analyser.fftSize);
    const tick = () => {
      analyser.getByteTimeDomainData(data);
      let sum = 0;
      for (const x of data) {
        const n = (x - 128) / 128;
        sum += n * n;
      }
      const rms = Math.sqrt(sum / data.length);
      const db = rms > 0.00001 ? 20 * Math.log10(rms) : -80;
      setLevel(clamp(Math.round((db + 60) * 100 / 60), 0, 100));
      rafRef.current = requestAnimationFrame(tick);
    };
    tick();
  }

  async function startMic() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false
        },
        video: false
      });

      const AudioContext = window.AudioContext || window.webkitAudioContext;
      const ctx = new AudioContext();
      const source = ctx.createMediaStreamSource(stream);

      const inputGain = ctx.createGain();
      inputGain.gain.value = Math.pow(10, gain / 20);

      // Web Audio does not expose a true DSP noise suppressor.
      // This gate is a simple low-level noise reduction stage.
      const gateNode = ctx.createDynamicsCompressor();
      gateNode.threshold.value = gate;
      gateNode.knee.value = 0;
      gateNode.ratio.value = 20;
      gateNode.attack.value = 0.003;
      gateNode.release.value = 0.12;

      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = compressor ? -18 : 0;
      comp.knee.value = 18;
      comp.ratio.value = 4;
      comp.attack.value = 0.005;
      comp.release.value = 0.12;

      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;

      // Keep processed audio inside this app. It is intentionally not routed
      // into another Android app such as Discord.
      source.connect(inputGain);
      if (noise) inputGain.connect(gateNode);
      else inputGain.connect(comp);
      if (noise) gateNode.connect(comp);
      comp.connect(analyser);
      analyser.connect(ctx.destination);

      streamRef.current = stream;
      ctxRef.current = ctx;
      sourceRef.current = source;
      gainRef.current = inputGain;
      gateRef.current = gateNode;
      compressorRef.current = comp;
      analyserRef.current = analyser;

      await ctx.resume();
      setRunning(true);
      setMessage("Mic đang chạy — âm thanh được monitor trong app");
      startMeter();
    } catch (err) {
      setMessage("Không mở được microphone: " + (err?.message || "permission denied"));
    }
  }

  function stopMic() {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    if (ctxRef.current) ctxRef.current.close().catch(() => {});
    streamRef.current = null;
    ctxRef.current = null;
    sourceRef.current = null;
    gainRef.current = null;
    gateRef.current = null;
    compressorRef.current = null;
    analyserRef.current = null;
    setRunning(false);
    setLevel(0);
    setMessage("Mic đang tắt");
  }

  return (
    <main className="app">
      <header className="topbar">
        <div>
          <div className="eyebrow">AUDIO CONTROL</div>
          <h1>Mic Boost</h1>
        </div>
        <div className={"status " + (running ? "on" : "")}>
          <span></span>{running ? "LIVE" : "OFF"}
        </div>
      </header>

      <section className="card hero">
        <div className="mic-icon">MIC</div>
        <div className="hero-copy">
          <strong>Microphone Monitor</strong>
          <small>{message}</small>
        </div>
        <button className={"power " + (running ? "active" : "")}
          onClick={running ? stopMic : startMic}>
          {running ? "DỪNG" : "BẬT MIC"}
        </button>
      </section>

      <section className="card">
        <div className="section-title">
          <h2>MIC GAIN</h2>
          <b>{gain > 0 ? "+" : ""}{gain} dB</b>
        </div>
        <input type="range" min="-12" max="24" step="1" value={gain}
          onChange={e => setGain(Number(e.target.value))} />
        <div className="scale"><span>-12</span><span>0</span><span>+12</span><span>+24 dB</span></div>
        <p className="hint">Tăng âm lượng đầu vào. Với mic điện thoại, nên tăng từng bước để tránh clipping.</p>
      </section>

      <section className="card">
        <div className="section-title">
          <h2>NOISE CONTROL</h2>
          <label className="switch">
            <input type="checkbox" checked={noise} onChange={e => setNoise(e.target.checked)} />
            <span></span>
          </label>
        </div>
        <div className="row">
          <span>Noise Gate</span>
          <strong>{gate} dB</strong>
        </div>
        <input type="range" min="-70" max="-20" step="1" value={gate}
          onChange={e => setGate(Number(e.target.value))} disabled={!noise} />
        <p className="hint">Hạ tiếng nền khi bạn không nói. Đây là noise gate, không phải AI noise cancellation.</p>
      </section>

      <section className="card">
        <div className="section-title">
          <h2>VOICE LEVEL</h2>
          <span className="mono">{level}%</span>
        </div>
        <div className="meter"><div style={{width: `${level}%`}} /></div>
        <div className="row compact">
          <span>Compressor</span>
          <label className="switch">
            <input type="checkbox" checked={compressor} onChange={e => setCompressor(e.target.checked)} />
            <span></span>
          </label>
        </div>
      </section>

      <section className="card info">
        <h2>DISCORD / APP NOTE</h2>
        <p>
          Android không cho một APK thông thường chèn trực tiếp tín hiệu microphone
          đã xử lý vào luồng microphone của Discord. App này xử lý và monitor mic
          trong chính app. Muốn áp dụng DSP cho Discord cần một giải pháp âm thanh
          được Discord/Android hỗ trợ, hoặc thiết bị/driver audio riêng.
        </p>
      </section>

      <footer>Mic Boost • local audio processing • no AI UI</footer>
    </main>
  );
}

createRoot(document.getElementById("root")).render(<App />);
