import { Routes, Route } from 'react-router-dom';
import Topbar from './components/Topbar';
import Tooltip from './components/Tooltip';
import Home from './pages/Home';
import Context from './pages/Context';
import Record from './pages/Record';
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
          <Route path="/processing" element={<Processing />} />
          <Route path="/results" element={<Results />} />
          <Route path="/compare" element={<Compare />} />
        </Routes>
      </div>
      <Tooltip />
    </>
  );
}
