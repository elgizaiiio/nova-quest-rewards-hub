import { MemoryRouter } from "react-router-dom";
import CeyoSettings from "./CeyoSettings";

export default function CeyoSettingsPreview() {
  return <MemoryRouter initialEntries={["/settings"]}><CeyoSettings /></MemoryRouter>;
}
