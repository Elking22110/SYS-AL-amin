import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./index.css";
import "./utils/productTrace.js"; // Product write tracer (must load before proxy)
import "./utils/localStorageProxy"; // Inject sync proxy

ReactDOM.createRoot(document.getElementById("root")).render(
  <BrowserRouter>
    <App />
  </BrowserRouter>
);