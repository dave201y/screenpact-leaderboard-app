import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import FigmaApp from "./FigmaApp";

createRoot(document.getElementById("root")!).render(
	<StrictMode>
		<FigmaApp />
	</StrictMode>,
);

if ("serviceWorker" in navigator && import.meta.env.PROD) {
	window.addEventListener("load", () => {
		navigator.serviceWorker.register("/sw.js").catch(() => {
			// Silent fail for environments where service workers are unavailable.
		});
	});
}
