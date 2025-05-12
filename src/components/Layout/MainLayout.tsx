import React from 'react';
import { Navigation } from '../Navigation';
import { ObjectDetection } from '../ObjectDetection';
import { PersonalAssistant } from '../PersonalAssistant';
import  TextReader  from '../TextReader';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/Tabs';
import { Map, Eye, MessageSquare, FileText } from 'lucide-react';

export function MainLayout() {
  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <h1 className="text-2xl font-bold text-center mb-6">Assistive Technology Suite</h1>
      
      <Tabs defaultValue="navigation" className="max-w-4xl mx-auto">
        <TabsList className="grid grid-cols-4 gap-4 mb-6">
          <TabsTrigger value="navigation" className="flex items-center gap-2">
            <Map className="w-5 h-5" />
            <span>Navigation</span>
          </TabsTrigger>
          <TabsTrigger value="detection" className="flex items-center gap-2">
            <Eye className="w-5 h-5" />
            <span>Object Detection</span>
          </TabsTrigger>
          <TabsTrigger value="assistant" className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            <span>AI Assistant</span>
          </TabsTrigger>
          <TabsTrigger value="reader" className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            <span>Text Reader</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="navigation">
          <Navigation />
        </TabsContent>
        <TabsContent value="detection">
          <ObjectDetection />
        </TabsContent>
        <TabsContent value="assistant">
          <PersonalAssistant />
        </TabsContent>
        <TabsContent value="reader">
          <TextReader />
        </TabsContent>
      </Tabs>
    </div>
  );
}