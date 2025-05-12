import React from 'react';
import { Navigation } from '../Navigation';
import { ObjectDetection } from '../ObjectDetection';
import { PersonalAssistant } from '../PersonalAssistant';
import  TextReader  from '../TextReader';
import { Map, Eye, MessageSquare, FileText } from 'lucide-react';

export function Layout() {
  const [activeTab, setActiveTab] = React.useState('assistant');

  const tabs = [
    { id: 'navigation', icon: Map, label: 'Navigation', component: Navigation },
    { id: 'detection', icon: Eye, label: 'Object Detection', component: ObjectDetection },
    { id: 'assistant', icon: MessageSquare, label: 'AI Assistant', component: PersonalAssistant },
    { id: 'reader', icon: FileText, label: 'Text Reader', component: TextReader }
  ];

  const ActiveComponent = tabs.find(tab => tab.id === activeTab)?.component || PersonalAssistant;

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <h1 className="text-2xl font-bold text-center mb-6">Assistive Technology Suite</h1>
      
      <div className="max-w-4xl mx-auto">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-6">
          {tabs.map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center justify-center gap-2 p-4 rounded-lg transition-colors ${
                activeTab === id
                  ? 'bg-blue-500 text-white'
                  : 'bg-white hover:bg-gray-100'
              }`}
              aria-selected={activeTab === id}
              role="tab"
            >
              <Icon className="w-5 h-5" />
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </div>

        <div className="bg-white rounded-lg shadow-md p-4">
          <ActiveComponent />
        </div>
      </div>
    </div>
  );
}