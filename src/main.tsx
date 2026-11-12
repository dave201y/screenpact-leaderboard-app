import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import ScreenPactApp from "./ScreenPactApp";

createRoot(document.getElementById("root")!).render(
	<StrictMode>
		<ScreenPactApp />
	</StrictMode>,
);

if ("serviceWorker" in navigator && import.meta.env.PROD) {
	window.addEventListener("load", () => {
		navigator.serviceWorker.register("/sw.js").catch(() => {
			// Silent fail for environments where service workers are unavailable.
		});
	});
}
