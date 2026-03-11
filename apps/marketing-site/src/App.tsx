import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Activate from "./pages/Activate";
import Apply from "./pages/Apply";
import Application from "./pages/Application";
import ApplySuccess from "./pages/ApplySuccess";
import Feedback from "./pages/Feedback";
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";
import NotFound from "./pages/NotFound";

export default function App() {
  return (
    /*
      The marketing site routes live here so every public-facing page sits under
      one predictable browser router. The legal/support pages copied from the
      older web app are added here rather than hidden behind footer mailto links.
    */
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/activate" element={<Activate />} />
        <Route path="/apply" element={<Apply />} />
        <Route path="/apply/application" element={<Application />} />
        <Route path="/apply/id/:application_id" element={<ApplySuccess />} />
        <Route path="/feedback" element={<Feedback />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}
