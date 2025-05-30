import React from "react";
import { createRoot } from "react-dom/client";

import dayjs from "dayjs";
import App from "./App";
import "./i18n";

import "@tremor/react/dist/esm/tremor.css";

import WeekDay from "dayjs/plugin/weekday";
import LocaleData from "dayjs/plugin/localeData";
import LocalizedFormat from "dayjs/plugin/localizedFormat";

dayjs.extend(WeekDay);
dayjs.extend(LocaleData);
dayjs.extend(LocalizedFormat);

const container = document.getElementById("root");
// eslint-disable-next-line
const root = createRoot(container!);

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
