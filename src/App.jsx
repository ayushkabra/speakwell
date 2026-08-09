import { Routes, Route } from 'react-router-dom';
import Topbar from './components/Topbar';
import Tooltip from './components/Tooltip';
import Home from './pages/Home';
import Context from './pages/Context';
import Record from './pages/Record';
import DrillSetup from './pages/DrillSetup';
import DrillRecord from './pages/DrillRecord';
import LadderSetup from './pages/LadderSetup';
import LadderRecord from './pages/LadderRecord';
import SlideSetup from './pages/SlideSetup';
import SlideRecord from './pages/SlideRecord';
import FrameworkSetup from './pages/FrameworkSetup';
import FrameworkRecord from './pages/FrameworkRecord';
import ScriptSetup from './pages/ScriptSetup';
import ScriptRecord from './pages/ScriptRecord';
import Processing from './pages/Processing';
import Results from './pages/Results';
import Compare from './pages/Compare';

export default function App() {
  return (
    <>
      <Topbar />
      <div className="pt-[60px] min-h-screen flex flex-col items-center">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/context" element={<Context />} />
          <Route path="/record" element={<Record />} />
          <Route path="/drill-setup" element={<DrillSetup />} />
          <Route path="/drill-record" element={<DrillRecord />} />
          <Route path="/ladder-setup" element={<LadderSetup />} />
          <Route path="/ladder-record" element={<LadderRecord />} />
          <Route path="/slide-setup" element={<SlideSetup />} />
          <Route path="/slide-record" element={<SlideRecord />} />
          <Route path="/framework-setup" element={<FrameworkSetup />} />
          <Route path="/framework-record" element={<FrameworkRecord />} />
          <Route path="/script-setup" element={<ScriptSetup />} />
          <Route path="/script-record" element={<ScriptRecord />} />
          <Route path="/processing" element={<Processing />} />
          <Route path="/results" element={<Results />} />
          <Route path="/compare" element={<Compare />} />
        </Routes>
      </div>
      <Tooltip />
    </>
  );
}
