import React from 'react';
// import { Navigation } from './components/Navigation';
import WebcamFeed from './components/WebcamFeed';
// import { PersonalAssistant } from './components/PersonalAssistant';
import TextReader from './components/TextReader';
import { Map, Eye, MessageSquare, FileText } from 'lucide-react';

function App() {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-white to-gray-100">

      {/* Header */}
      <header className="bg-white shadow-md py-6 px-4 sm:px-6">
        <div className="max-w-screen-lg mx-auto text-center">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-purple-700 tracking-tight">
            Assistive Vision
          </h1>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow px-4 py-8">
        <div className="max-w-screen-lg mx-auto grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8">

          {/* Real World Detection */}
          <section className="card flex flex-col items-center text-center">
            <Eye className="icon text-green-600 mb-4" />
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Real World Detection</h2>
            <WebcamFeed />
          </section>

          {/* Document Reader */}
          <section className="card flex flex-col items-center text-center">
            <FileText className="icon text-orange-500 mb-4" />
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Document Reader</h2>
            <TextReader />
          </section>

          {/* Optional AI Assistant */}
          {/*
          <section className="card flex flex-col items-center text-center">
            <MessageSquare className="icon text-purple-600 mb-4" />
            <h2 className="text-xl font-semibold text-gray-800 mb-4">AI Assistant</h2>
            <PersonalAssistant />
          </section>
          */}

          {/* Optional Navigation */}
          {/*
          <section className="card flex flex-col items-center text-center">
            <Map className="icon text-blue-600 mb-4" />
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Navigation Assistant</h2>
            <Navigation />
          </section>
          */}
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 py-4">
        <div className="max-w-screen-lg mx-auto text-center px-4">
          <p className="text-xs sm:text-sm text-gray-500">
            &copy; {new Date().getFullYear()} <span className="font-semibold text-purple-700">Assistive Vision</span>. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}

export default App;
