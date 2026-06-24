import React from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

function App() {
  return (
    <main className="shell">
      <section className="panel">
        <p className="eyebrow">Codex Cloud ready</p>
        <h1>アプリ開発の土台ができました</h1>
        <p className="lead">
          このリポジトリをGitHubに置いておけば、MacBook AirやMacBook Proの電源状態に依存せず、
          Codex Cloudで開発を進めやすくなります。
        </p>
        <div className="actions">
          <a href="https://chatgpt.com/codex" target="_blank" rel="noreferrer">
            Codexを開く
          </a>
          <span>npm run dev</span>
        </div>
      </section>
    </main>
  );
}

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
